"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DEFAULT_PERSONA, readFriendSettings, SHARE_TAB_LABEL, SHARE_TABS_LIST } from "@/convex/friend/pure";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Toggle, useAction } from "@/core/ui";
import { PipAvatar } from "../Avatars";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hourLabel = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: "numeric" });

/** Pip's settings: who Pip is, how often it pokes you, voice, what it knows from elsewhere. */
export function Settings() {
  const { profile } = useHub();
  const s = readFriendSettings(profile.moduleSettings);
  const update = useMutation(api.friend.entries.updateSettings);
  const release = useMutation(api.rooms.release);
  const { busy, error, run } = useAction();
  const p = s.persona;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en")));
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);
  const persona = (patch: Record<string, unknown>) => void run(() => update({ persona: patch }));
  const lines = (v: string[]) => v.join("\n");
  const fromLines = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);

  return (
    <div className="sh-container sh-narrow sh-stack">
      <div className="fr-head"><PipAvatar size={56} /><PageTitle title="Pip's settings" subtitle="Tune the friend. Nothing here is shared." /></div>
      <ErrorNote error={error} />

      <Card>
        <h2 className="sh-h2">Who Pip is</h2>
        <Field label="Name"><input className="sh-input" defaultValue={p.name} maxLength={40} onBlur={(e) => e.target.value.trim() !== p.name && persona({ name: e.target.value.trim() })} /></Field>
        <Slider label="Playful ↔ thoughtful" left="thoughtful" right="playful" value={p.sliders.playful} onChange={(v) => persona({ sliders: { ...p.sliders, playful: v } })} />
        <Slider label="Gentle ↔ blunt" left="gentle" right="blunt" value={p.sliders.blunt} onChange={(v) => persona({ sliders: { ...p.sliders, blunt: v } })} />
        <Slider label="Concise ↔ chatty" left="concise" right="chatty" value={p.sliders.chatty} onChange={(v) => persona({ sliders: { ...p.sliders, chatty: v } })} />
        <Slider label="Pun frequency" left="rare" right="shameless" value={p.punFrequency} onChange={(v) => persona({ punFrequency: v })} />
        <Slider label="Spontaneity (curveballs, tangents, games)" left="calm" right="lots" value={p.spontaneity} onChange={(v) => persona({ spontaneity: v })} />
        <details className="sh-menu">
          <summary>Pip&apos;s traits, interests, opinions, and threads (one per line)</summary>
          <div className="sh-stack-sm" style={{ marginTop: "0.5rem" }}>
            <Field label="Traits"><textarea className="sh-input sh-textarea" rows={6} defaultValue={lines(p.traits)} onBlur={(e) => persona({ traits: fromLines(e.target.value) })} /></Field>
            <Field label="Interests and tastes"><textarea className="sh-input sh-textarea" rows={6} defaultValue={lines(p.interests)} onBlur={(e) => persona({ interests: fromLines(e.target.value) })} /></Field>
            <Field label="Opinions it holds"><textarea className="sh-input sh-textarea" rows={6} defaultValue={lines(p.opinions)} onBlur={(e) => persona({ opinions: fromLines(e.target.value) })} /></Field>
            <Field label="Things it's chewing on"><textarea className="sh-input sh-textarea" rows={4} defaultValue={lines(p.threads)} onBlur={(e) => persona({ threads: fromLines(e.target.value) })} /></Field>
            <Field label="Neighbors" hint="One per line as Name: who they are. Juniper and Bramble are the defaults.">
              <textarea className="sh-input sh-textarea" rows={4} defaultValue={p.neighbors.map((n) => `${n.name}${n.nickname ? ` (${n.nickname})` : ""}: ${n.who}`).join("\n")} onBlur={(e) => persona({ neighbors: fromLines(e.target.value).map((l) => { const m = l.match(/^([^:(]+)(?:\(([^)]+)\))?\s*:\s*(.+)$/); return m ? { name: m[1].trim(), ...(m[2] ? { nickname: m[2].trim() } : {}), who: m[3].trim() } : null; }).filter(Boolean) })} />
            </Field>
            <Btn variant="ghost" disabled={busy} onClick={() => { if (window.confirm("Put Pip's traits, interests, opinions, threads, and neighbors back to the defaults?")) persona({ traits: DEFAULT_PERSONA.traits, interests: DEFAULT_PERSONA.interests, opinions: DEFAULT_PERSONA.opinions, threads: DEFAULT_PERSONA.threads, neighbors: DEFAULT_PERSONA.neighbors }); }}>Back to defaults</Btn>
          </div>
        </details>
      </Card>

      <Card>
        <h2 className="sh-h2">Pip reaching out</h2>
        <Toggle checked={p.nudgesEnabled} disabled={busy} onChange={(v) => persona({ nudgesEnabled: v })} label="Pip can message me first" hint="At most once a day, never on a day you already talked, never when you're marked busy. Sent the way you chose for 'everything else' under Notifications." />
        <Toggle checked={s.busy} disabled={busy} onChange={(v) => void run(() => update({ busy: v }))} label="I'm busy right now" hint="Pauses nudges until you turn it off. Pip keeps things short if you drop in." />
        <Toggle checked={p.quietHoursEnabled} disabled={busy} onChange={(v) => persona({ quietHoursEnabled: v })} label="Quiet hours for Pip" hint="Off by default." />
        {p.quietHoursEnabled && (
          <div className="sh-row sh-wrap" style={{ gap: "0.6rem" }}>
            <Field label="From"><select className="sh-input" value={p.quietHours.start} onChange={(e) => persona({ quietHours: { ...p.quietHours, start: Number(e.target.value) } })}>{HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}</select></Field>
            <Field label="Until"><select className="sh-input" value={p.quietHours.end} onChange={(e) => persona({ quietHours: { ...p.quietHours, end: Number(e.target.value) } })}>{HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}</select></Field>
          </div>
        )}
        <p className="sh-hint">In Brave, notifications from a website need &ldquo;Use Google services for push messaging&rdquo; turned on under Brave&apos;s Settings, Privacy and security. If that&apos;s off, Pip&apos;s nudges still show at the top of the chat the next time you open The Shire.</p>
      </Card>

      <Card>
        <h2 className="sh-h2">Pip&apos;s voice</h2>
        <Toggle checked={p.voiceEnabled} disabled={busy} onChange={(v) => persona({ voiceEnabled: v })} label="Read Pip's replies out loud" hint="Uses the voices already on this computer or phone. Free. Works in Brave." />
        {p.voiceEnabled && (
          <Field label="Voice" hint="The warmest one it can find is the default.">
            <select className="sh-input" value={p.voiceName} onChange={(e) => persona({ voiceName: e.target.value })}>
              <option value="">Let Pip pick</option>
              {voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
            </select>
          </Field>
        )}
        <p className="sh-hint">You talking to Pip by voice is coming later, with a small speech-to-text model that runs on your own computer so nothing leaves it; Brave blocks the browser&apos;s built-in one. Premium voices stay off unless you ever turn them on; nothing here bills anything.</p>
      </Card>

      <Card>
        <h2 className="sh-h2">What Pip knows from the rest of The Shire</h2>
        <p className="sh-hint">Headlines only: one plain line a week per place, built from counts, never from your words. Off places share nothing. &ldquo;Tell Pip&rdquo; on a single item always works.</p>
        {SHARE_TABS_LIST.map((t) => (
          <Toggle key={t} checked={s.shares[t]} disabled={busy} onChange={(v) => void run(() => update({ shares: { [t]: v } }))} label={SHARE_TAB_LABEL[t]} />
        ))}
      </Card>

      <Card>
        <h2 className="sh-h2">Game night, Steam, and watching along</h2>
        <p className="sh-muted">Not built yet. Next up: Pip knowing what you&apos;re playing on Steam and reacting as you play, then a compact second-screen view, then mini games (chess, cards, word games) inside this tab. Screen capture, if ever, will be off by default with a visible &ldquo;Pip is watching&rdquo; sign.</p>
      </Card>

      <Note>Pip&apos;s room is yours. The other account can never see anything in it, and no other place in The Shire reads Pip&apos;s memory.</Note>
      <details className="sh-menu">
        <summary>Give the room back</summary>
        <p className="sh-hint">Deletes every conversation, memory, joke, and list in Pip&apos;s room and removes your claim. Not undoable.</p>
        <Btn variant="ghost" disabled={busy} onClick={() => { if (window.confirm("Release Pip's room and delete everything in it?")) void run(() => release({ moduleId: "friend", confirm: "release" })); }}>Release the room</Btn>
      </details>
    </div>
  );
}

function Slider({ label, left, right, value, onChange }: { label: string; left: string; right: string; value: number; onChange: (v: number) => void }) {
  const [v, setV] = useState(value);
  return (
    <Field label={label} hint={`${left} ← ${v} → ${right}`}>
      <input className="fr-slider" type="range" min={0} max={100} value={v} onChange={(e) => setV(Number(e.target.value))} onMouseUp={() => v !== value && onChange(v)} onTouchEnd={() => v !== value && onChange(v)} onKeyUp={() => v !== value && onChange(v)} aria-label={label} />
    </Field>
  );
}
