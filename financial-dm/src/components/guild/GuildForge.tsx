import { useCallback, useEffect, useRef, useState } from "react";
import {
  FLAG_KIND_LABEL,
  GUILD_CAROUSEL_TOPICS,
  GUILD_OUTPUT_KINDS,
  GUILD_SCRIPT_TOPICS,
  kindLabel,
  type GuildOutputKind,
  type RecruitFlag,
} from "~/lib/guildCompliance";
import { GUILD_CONFIG } from "~/lib/guildConfig";
import { downloadElementPng } from "~/lib/exportPng";
import type { CampaignBrief } from "~/lib/campaign";
import { attachOutputToSlot } from "~/server/campaign";
import {
  acknowledgeGuildFlags,
  deleteGuildOutput,
  forgeGuildCards,
  forgeGuildCarousel,
  forgeGuildFlyer,
  forgeGuildJobPost,
  forgeGuildScript,
  forgeGuildTextPosts,
  getGuildForgeStatus,
  getGuildOutputs,
  saveGuildOutput,
  setGuildOutputApproved,
  type GuildBody,
  type GuildCardsBody,
  type GuildCarouselBody,
  type GuildDraft,
  type GuildFlyerBody,
  type GuildJobPostBody,
  type GuildOutput,
  type GuildScriptBody,
  type GuildTextPostsBody,
} from "~/server/guildForge";

/**
 * Recruiting mode in the forge (recruiting spec, Section 6). Scripts, Trap
 * or Treasure cards, carousels, flyer variations, job posts, and text-only
 * posts, all built from John's confirmed trust facts. Every output shows
 * its flag words; John acknowledges them before he can approve it.
 */

const card = "rounded-xl border border-[#406080]/30 bg-[#111a28]";
const btnPrimary = "px-4 py-2 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold font-fantasy text-sm disabled:opacity-50";
const btnGhost = "px-3 py-1.5 rounded-lg border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 font-fantasy text-xs";
const select = "px-3 py-2 rounded-lg bg-[#0d1520]/60 border border-[#406080]/40 text-[#e0e0e0] text-sm focus:outline-none focus:border-[#c08020]/50";

/** Which Guild output a quest slot's generator maps to (recruiting spec, Section 7.1). */
function kindForBrief(brief?: CampaignBrief): GuildOutputKind {
  if (!brief) return "script";
  if (brief.generator === "carousel") return "carousel";
  if (brief.generator === "social_card" || brief.generator === "insight_card") return "cards";
  return "script";
}

export default function GuildForge({ brief }: { brief?: CampaignBrief }) {
  const campaignSlug = brief?.url ? brief.url.split("/").pop() : undefined;
  const [status, setStatus] = useState<{ ready: boolean; missing: string[] } | null>(null);
  const [kind, setKind] = useState<GuildOutputKind>(() => kindForBrief(brief));
  const [questState, setQuestState] = useState<"idle" | "saving" | "saved">("idle");
  const [questNote, setQuestNote] = useState("");
  useEffect(() => {
    if (brief) setKind(kindForBrief(brief));
  }, [brief]);
  const [scriptTopic, setScriptTopic] = useState<string>(GUILD_SCRIPT_TOPICS[0].id);
  const [carouselTopic, setCarouselTopic] = useState<string>(GUILD_CAROUSEL_TOPICS[0].id);
  const [platform, setPlatform] = useState<"job_board" | "facebook">("job_board");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<GuildDraft | null>(null);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    getGuildForgeStatus().then((s) => setStatus({ ready: s.ready, missing: s.missing })).catch((e) => setError(String(e)));
  }, []);

  const forge = async () => {
    setBusy(true);
    setError("");
    setSaved("idle");
    setQuestState("idle");
    setQuestNote("");
    try {
      const data = { campaignSlug };
      const res =
        kind === "script" ? await forgeGuildScript({ data: { ...data, topic: scriptTopic } })
        : kind === "cards" ? await forgeGuildCards({ data })
        : kind === "carousel" ? await forgeGuildCarousel({ data: { ...data, topic: carouselTopic } })
        : kind === "job_post" ? await forgeGuildJobPost({ data: { ...data, platform } })
        : kind === "text_posts" ? await forgeGuildTextPosts({ data })
        : await forgeGuildFlyer({ data });
      if (!res.ok) setError(res.error);
      else setDraft(res.draft);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const save = async (): Promise<number | null> => {
    if (!draft) return null;
    setSaved("saving");
    const res = await saveGuildOutput({ data: { kind: draft.kind, title: draft.title, body: draft.body, flags: draft.flags } });
    setSaved(res.ok ? "saved" : "idle");
    if (!res.ok) setError(res.error || "Could not save.");
    return res.ok && res.id ? res.id : null;
  };

  /** Save, then attach to the quest slot: the slot moves to Drafted (recruiting spec, Section 7.1). */
  const saveToQuest = async () => {
    if (!draft || !brief) return;
    setQuestState("saving");
    setQuestNote("");
    const id = await save();
    if (!id) {
      setQuestState("idle");
      return;
    }
    const att = await attachOutputToSlot({ data: { slotId: brief.slotId, ref: `guild:${id}`, text: draft.plain } });
    if (!att.ok) {
      setQuestState("idle");
      setQuestNote(att.error || "Could not save to the quest.");
      return;
    }
    setQuestState("saved");
    setQuestNote(draft.flags.length ? `⚠️ ${draft.flags.length} flag${draft.flags.length === 1 ? "" : "s"} to acknowledge before approval.` : "Slot moved to Drafted.");
  };

  if (status && !status.ready) {
    return (
      <section className={`${card} p-6 border-[#c08020]/40`} data-guild-forge-locked>
        <h3 className="font-fantasy text-[#c08020] text-lg">🔒 Confirm the Guild facts first</h3>
        <p className="text-[#a0a0a0] text-sm font-fantasy mt-2">The recruiting forge only ever uses John's confirmed words, so it stays closed until every required fact and FAQ answer is confirmed in the Guild tab.</p>
        <p className="text-[#606080] text-xs font-fantasy mt-2">Still needed: {status.missing.slice(0, 6).join(", ")}{status.missing.length > 6 ? ` and ${status.missing.length - 6} more` : ""}</p>
        <a href="/guild-hall?view=facts" className={`${btnPrimary} inline-block mt-4`}>Open the Guild facts</a>
      </section>
    );
  }

  return (
    <div className="space-y-5" data-guild-forge>
      <section className={`${card} p-4 space-y-3`}>
        <p className="text-[#a0a0a0] text-xs font-fantasy">Every piece here is built only from the confirmed Guild facts, names the industry, and ends with the call to action. Flagged words must be acknowledged before John approves anything.</p>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="What to make">
          {GUILD_OUTPUT_KINDS.map((k) => (
            <button key={k.id} type="button" role="tab" aria-selected={kind === k.id} onClick={() => { setKind(k.id); setDraft(null); setError(""); }} className={`px-3 py-2 rounded-lg border font-fantasy text-sm ${kind === k.id ? "bg-[#c08020] border-[#c08020] text-[#0d1520] font-bold" : "border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0]"}`} data-guild-kind={k.id} title={k.blurb}>
              {k.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {kind === "script" && (
            <select className={select} value={scriptTopic} onChange={(e) => setScriptTopic(e.target.value)} data-guild-topic>
              {GUILD_SCRIPT_TOPICS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          )}
          {kind === "carousel" && (
            <select className={select} value={carouselTopic} onChange={(e) => setCarouselTopic(e.target.value)} data-guild-topic>
              {GUILD_CAROUSEL_TOPICS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          )}
          {kind === "job_post" && (
            <select className={select} value={platform} onChange={(e) => setPlatform(e.target.value as "job_board" | "facebook")} data-guild-platform>
              <option value="job_board">For a job board</option>
              <option value="facebook">For a Facebook group</option>
            </select>
          )}
          <button type="button" onClick={forge} disabled={busy || !status} className={btnPrimary} data-guild-forge-button>
            {busy ? "🔮 Forging..." : kind === "flyer" ? "📄 Build the flyer" : "🔮 Forge it"}
          </button>
          {campaignSlug && <span className="text-xs text-[#7fd08a] font-fantasy">Ends with thefinancialdm.com/{campaignSlug}</span>}
        </div>
        {error && <p className="text-red-300 text-sm font-fantasy" data-guild-error>{error}</p>}
      </section>

      {draft && (
        <section className={`${card} p-4 space-y-4`} data-guild-draft={draft.kind}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-fantasy text-[#c08020] text-lg">{kindLabel(draft.kind)} · {draft.title}</h3>
            <div className="flex gap-2">
              <button type="button" onClick={() => navigator.clipboard?.writeText(draft.plain)} className={btnGhost}>📋 Copy text</button>
              <button type="button" onClick={save} disabled={saved !== "idle"} className={brief ? btnGhost : btnPrimary} data-guild-save>
                {saved === "saving" ? "Saving..." : saved === "saved" ? "✅ Saved" : "💾 Save"}
              </button>
              {brief && (
                <button type="button" onClick={saveToQuest} disabled={questState !== "idle"} className={btnPrimary} data-save-to-quest>
                  {questState === "saving" ? "🗺️ Saving to quest..." : questState === "saved" ? "✅ Saved to quest" : "🗺️ Save to quest"}
                </button>
              )}
            </div>
          </div>
          {questNote && <p className="text-xs font-fantasy text-[#a0a0a0]" data-quest-note>{questNote}</p>}
          <FlagPanel flags={draft.flags} />
          <OutputView kind={draft.kind} body={draft.body} />
        </section>
      )}
    </div>
  );
}

// ── Flags ───────────────────────────────────────────────────────────

function FlagPanel({ flags, acknowledged, onAcknowledge }: { flags: RecruitFlag[]; acknowledged?: boolean; onAcknowledge?: () => void }) {
  if (!flags.length) return <p className="text-[11px] text-[#7fd08a] font-fantasy" data-no-flags>✓ No flagged words. Named the industry, kept the disclosure where it applies.</p>;
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs font-fantasy ${acknowledged ? "border-[#406080]/40 text-[#a0a0a0]" : "border-[#c08020]/50 bg-[#c08020]/10 text-[#e0c890]"}`} data-guild-flags>
      <p className="font-bold">⚠️ {flags.length} thing{flags.length === 1 ? "" : "s"} to check before this is approved{acknowledged ? " · acknowledged" : ""}</p>
      <ul className="mt-1 space-y-0.5">
        {flags.map((f, i) => (
          <li key={i}>
            <span className="text-[#c08020]">{FLAG_KIND_LABEL[f.kind]}:</span> {f.text}
          </li>
        ))}
      </ul>
      {onAcknowledge && !acknowledged && (
        <button type="button" onClick={onAcknowledge} className="mt-2 underline text-[#c08020]" data-ack-guild-flags>I have read these</button>
      )}
    </div>
  );
}

// ── Output views ────────────────────────────────────────────────────

function OutputView({ kind, body }: { kind: GuildOutputKind; body: GuildBody }) {
  switch (kind) {
    case "script": {
      const b = body as GuildScriptBody;
      return (
        <div className="space-y-3 text-sm">
          <p className="text-[#c08020] font-fantasy">Hook: <span className="text-[#e0e0e0]">{b.hook}</span></p>
          <p className="whitespace-pre-line text-[#e0e0e0] leading-relaxed" data-script-body>{b.body}</p>
          <p className="text-[#a0a0a0] whitespace-pre-line"><span className="text-[#606080] font-fantasy">Caption:</span> {b.caption}</p>
          <p className="text-[#606080] text-xs">{b.hashtags.join(" ")}</p>
        </div>
      );
    }
    case "cards": {
      const b = body as GuildCardsBody;
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {b.cards.map((c, i) => (
              <div key={i} className={`rounded-xl border p-4 ${c.verdict === "trap" ? "border-red-700/40 bg-red-900/10" : "border-[#7fd08a]/40 bg-[#7fd08a]/5"}`} data-guild-card>
                <p className="text-[10px] uppercase tracking-wider font-fantasy text-[#606080]">{c.verdict === "trap" ? "🪤 Trap" : "💎 Treasure"}</p>
                <p className="text-[#e0e0e0] font-fantasy mt-1">"{c.myth}"</p>
                <p className="text-[#a0a0a0] text-sm mt-2">{c.truth}</p>
              </div>
            ))}
          </div>
          <p className="text-[#a0a0a0] text-sm whitespace-pre-line"><span className="text-[#606080] font-fantasy">Caption:</span> {b.caption}</p>
        </div>
      );
    }
    case "carousel": {
      const b = body as GuildCarouselBody;
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {b.slides.map((s, i) => (
              <CarouselSlide key={i} n={i + 1} title={s.title} body={s.body} />
            ))}
          </div>
          <p className="text-[#a0a0a0] text-sm whitespace-pre-line"><span className="text-[#606080] font-fantasy">Caption:</span> {b.caption}</p>
        </div>
      );
    }
    case "job_post":
      return <pre className="whitespace-pre-wrap font-sans text-sm text-[#e0e0e0] leading-relaxed" data-job-post>{(body as GuildJobPostBody).text}</pre>;
    case "text_posts":
      return (
        <div className="grid gap-3 md:grid-cols-3">
          {(body as GuildTextPostsBody).posts.map((p, i) => (
            <div key={i} className="rounded-lg border border-[#406080]/30 bg-[#0d1520]/60 p-3 text-sm text-[#e0e0e0] whitespace-pre-line" data-text-post>
              {p}
              <button type="button" onClick={() => navigator.clipboard?.writeText(p)} className={`${btnGhost} mt-2 block`}>📋 Copy</button>
            </div>
          ))}
        </div>
      );
    case "flyer":
      return <FlyerVariations body={body as GuildFlyerBody} />;
  }
}

/** A carousel slide in the flyer's palette, exportable as a square PNG. */
function CarouselSlide({ n, title, body }: { n: number; title: string; body: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="space-y-1">
      <div ref={ref} className="aspect-square w-full rounded-xl overflow-hidden flex flex-col justify-between p-6" style={{ background: "linear-gradient(180deg, #1c3660 0%, #14294a 100%)", fontFamily: "'Work Sans', system-ui, sans-serif" }}>
        <p className="text-[#c8a24b] text-xs tracking-widest uppercase" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>{n === 1 ? "The Guild" : `${n}`}</p>
        <div>
          <p className="text-[#f3eee3] text-2xl leading-tight" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>{title}</p>
          <p className="text-[#c9d3e3] text-sm mt-3 leading-relaxed">{body}</p>
        </div>
        <p className="text-[#c8a24b] text-[10px] tracking-wider uppercase">The Financial DM · {GUILD_CONFIG.presentedBy}</p>
      </div>
      <button type="button" onClick={() => ref.current && downloadElementPng(ref.current, `guild-slide-${n}.png`)} className={btnGhost}>⬇️ PNG</button>
    </div>
  );
}

// ── Flyer variations (Section 6: Letter print, 1080×1350, 1080×1920, with QR) ──

const SIZES = [
  { id: "letter", label: "US Letter (print)", w: 1275, h: 1650, file: "guild-flyer-letter.png" },
  { id: "social", label: "1080 × 1350 (feed post)", w: 1080, h: 1350, file: "guild-flyer-1080x1350.png" },
  { id: "story", label: "1080 × 1920 (story)", w: 1080, h: 1920, file: "guild-flyer-1080x1920.png" },
] as const;

function FlyerVariations({ body }: { body: GuildFlyerBody }) {
  const [qr, setQr] = useState<string>("");
  const [size, setSize] = useState<(typeof SIZES)[number]["id"]>("social");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    import("qrcode")
      .then((m) => m.toDataURL(body.url, { margin: 1, width: 400, color: { dark: "#1c3660", light: "#ffffff" } }))
      .then(setQr)
      .catch(() => setQr(""));
  }, [body.url]);
  const s = SIZES.find((x) => x.id === size)!;
  const scale = Math.min(1, 520 / s.w);
  return (
    <div className="space-y-3" data-flyer>
      <div className="flex flex-wrap items-center gap-2">
        {SIZES.map((x) => (
          <button key={x.id} type="button" onClick={() => setSize(x.id)} className={`${btnGhost} ${size === x.id ? "border-[#c08020] text-[#c08020]" : ""}`} data-flyer-size={x.id}>{x.label}</button>
        ))}
        <button type="button" onClick={() => ref.current && downloadElementPng(ref.current, s.file)} className={btnPrimary} data-flyer-download>⬇️ Download PNG</button>
        <span className="text-[11px] text-[#606080] font-fantasy">QR code opens {body.url.replace("https://", "")}</span>
      </div>
      <div className="overflow-x-auto">
        <div style={{ width: s.w * scale, height: s.h * scale }}>
          <div ref={ref} style={{ width: s.w, height: s.h, transform: `scale(${scale})`, transformOrigin: "top left", fontFamily: "'Work Sans', system-ui, sans-serif", background: "#f3eee3", color: "#2a3442", display: "flex", flexDirection: "column" }}>
            <div style={{ background: "#1c3660", color: "#f3eee3", padding: s.w * 0.07, borderBottom: `${s.w * 0.01}px solid #c8a24b`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: s.w * 0.04 }}>
              <div>
                <div style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: s.w * 0.075, lineHeight: 1.05 }}>{body.headline}</div>
                <div style={{ fontFamily: "'Cinzel', Georgia, serif", color: "#c8a24b", fontSize: s.w * 0.03, marginTop: s.w * 0.02, textTransform: "uppercase", letterSpacing: "0.04em" }}>{body.roleTitle}</div>
                <div style={{ marginTop: s.w * 0.025, display: "inline-block", border: "1px solid rgba(200,162,75,0.7)", borderRadius: 999, padding: `${s.w * 0.008}px ${s.w * 0.02}px`, fontSize: s.w * 0.018, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  Presented by <span style={{ color: "#c8a24b", textTransform: "none", letterSpacing: 0, fontFamily: "'Cinzel', Georgia, serif" }}>{GUILD_CONFIG.presentedBy}</span>
                </div>
              </div>
              <img src="/logo.png" alt="" style={{ width: s.w * 0.2, height: s.w * 0.2, borderRadius: "50%", flex: "none" }} />
            </div>
            <div style={{ padding: s.w * 0.06, display: "flex", flexDirection: "column", gap: s.w * 0.04, flex: 1 }}>
              <div style={{ border: "3px solid #1c3660", background: "#faf7f0", borderRadius: s.w * 0.015, padding: s.w * 0.035, fontSize: s.w * 0.03, lineHeight: 1.35 }}>
                🎲 Roll initiative on a new career: text <b style={{ fontFamily: "'Cinzel', Georgia, serif" }}>{GUILD_CONFIG.smsKeyword} + (your name)</b> to <b style={{ fontFamily: "'Cinzel', Georgia, serif", color: "#1c3660" }}>{body.phone}</b>
              </div>
              <div>
                <div style={{ fontFamily: "'Cinzel', Georgia, serif", color: "#1c3660", fontSize: s.w * 0.04, borderBottom: "2px solid #c8a24b", paddingBottom: s.w * 0.01, marginBottom: s.w * 0.02 }}>Your Quest</div>
                <div style={{ fontSize: s.w * 0.028, lineHeight: 1.45 }}>
                  <b style={{ color: "#1c3660" }}>{body.industry}.</b> {body.summary}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "'Cinzel', Georgia, serif", color: "#1c3660", fontSize: s.w * 0.04, borderBottom: "2px solid #c8a24b", paddingBottom: s.w * 0.01, marginBottom: s.w * 0.02 }}>Quest Requirements</div>
                <div style={{ display: "grid", gridTemplateColumns: s.id === "story" ? "1fr" : "1fr 1fr", gap: s.w * 0.015 }}>
                  {body.requirements.map((r) => (
                    <div key={r} style={{ background: "#faf7f0", border: "1px solid rgba(28,54,96,0.2)", borderRadius: s.w * 0.012, padding: `${s.w * 0.018}px ${s.w * 0.025}px`, fontSize: s.w * 0.026, display: "flex", alignItems: "center", gap: s.w * 0.02 }}>
                      <span style={{ width: s.w * 0.03, height: s.w * 0.03, background: "#1c3660", transform: "rotate(45deg)", borderRadius: 4, flex: "none" }} />
                      {r}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: s.w * 0.04, background: "#faf7f0", border: "1px solid rgba(28,54,96,0.2)", borderRadius: s.w * 0.015, padding: s.w * 0.03 }}>
                {qr ? <img src={qr} alt="" style={{ width: s.w * 0.2, height: s.w * 0.2, flex: "none" }} data-flyer-qr /> : <div style={{ width: s.w * 0.2, height: s.w * 0.2, background: "#e6e1d6" }} />}
                <div style={{ fontSize: s.w * 0.026, lineHeight: 1.4 }}>
                  <div style={{ fontFamily: "'Cinzel', Georgia, serif", color: "#1c3660", fontSize: s.w * 0.032 }}>Scan for straight answers</div>
                  Interviews are free, with no obligation.<br />
                  <b>{body.url.replace("https://", "")}</b>
                </div>
              </div>
            </div>
            <div style={{ background: "#1c3660", borderTop: `${s.w * 0.008}px solid #c8a24b`, color: "#f3eee3", padding: s.w * 0.03, textAlign: "center" }}>
              <div style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: s.w * 0.04 }}>The Financial DM</div>
              <div style={{ color: "#c8a24b", fontSize: s.w * 0.018, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: s.w * 0.008 }}>"{GUILD_CONFIG.tagline}"</div>
              <div style={{ fontSize: s.w * 0.016, marginTop: s.w * 0.012, opacity: 0.8 }}>Join the party · A division of {GUILD_CONFIG.presentedBy}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Saved outputs ───────────────────────────────────────────────────

export function SavedGuildOutputs() {
  const [rows, setRows] = useState<GuildOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getGuildOutputs());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const ack = async (id: number) => {
    await acknowledgeGuildFlags({ data: { id } });
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, flagsAcknowledged: true } : r)));
  };
  const approve = async (r: GuildOutput, approved: boolean) => {
    const res = await setGuildOutputApproved({ data: { id: r.id, approved } });
    if (!res.ok) {
      setError(res.error || "Could not change approval.");
      return;
    }
    setError("");
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, approved } : x)));
  };
  const remove = async (id: number) => {
    if (!confirm("Delete this saved piece?")) return;
    await deleteGuildOutput({ data: { id } });
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading && rows.length === 0) return <p className="text-[#a0a0a0] font-fantasy text-sm py-6 text-center">Opening the Guild ledger...</p>;
  return (
    <div className="space-y-3" data-saved-guild>
      <h2 className="font-fantasy text-[#c08020] text-lg">🛡️ Saved Guild pieces</h2>
      {error && <p className="text-red-300 text-sm font-fantasy" data-saved-guild-error>{error}</p>}
      {rows.length === 0 && <p className="text-[#606080] font-fantasy text-sm">Nothing saved yet. Forge something and press Save.</p>}
      {rows.map((r) => (
        <article key={r.id} className={`${card} p-4 space-y-2`} data-saved-guild-output={r.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[#e0e0e0] font-fantasy">{kindLabel(r.kind)} · {r.title}</p>
              <p className="text-[11px] text-[#606080] font-fantasy">{new Date(r.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {r.approved ? "✅ Approved by John" : "Not yet approved"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className={btnGhost}>{open === r.id ? "Hide" : "Show"}</button>
              <button type="button" onClick={() => navigator.clipboard?.writeText(r.plain)} className={btnGhost}>📋 Copy</button>
              <button type="button" onClick={() => approve(r, !r.approved)} className={r.approved ? btnGhost : btnPrimary} data-approve-guild>
                {r.approved ? "Un-approve" : "✅ Approve"}
              </button>
              <button type="button" onClick={() => remove(r.id)} className="text-red-400/70 hover:text-red-400 text-xs font-fantasy">🗑️</button>
            </div>
          </div>
          <FlagPanel flags={r.flags} acknowledged={r.flagsAcknowledged} onAcknowledge={() => ack(r.id)} />
          {open === r.id && <OutputView kind={r.kind} body={r.body} />}
        </article>
      ))}
    </div>
  );
}
