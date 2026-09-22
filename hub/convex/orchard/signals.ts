/**
 * My signals: the patterns Jen is done with in friendships (2026-09-22), each
 * with the early tell, the test that reveals it, what to do when it shows,
 * and its twin: the green version that earns a layer. Both people start
 * from this list; each can switch any off and add their own. Pure and
 * self-contained for the tests.
 */
export interface Signal {
  key: string;
  name: string;
  /** How it shows early. */
  tell: string;
  /** The test that reveals it, usually something you do less of. */
  test: string;
  /** What to do when it shows. */
  response: string;
  /** The green twin: what you're looking for instead. */
  twin: string;
  /** A hard line: one clear sighting is enough to change access. */
  hardLine?: boolean;
}

export const SIGNALS: Signal[] = [
  { key: "neverInitiates", name: "Never initiates", tell: "The thread only moves when you move it.", test: "Let it be quiet for two weeks. Don't reach out. See if they do.", response: "Two quiet windows with nothing back, and they move out a layer without a conversation.", twin: "Initiates both ways" },
  { key: "cantBeHonestUpset", name: "Can't be honest when upset with me", tell: "Sudden cooling, no words. You find out later, or never.", test: "Ask directly once: \"Did something land wrong?\"", response: "\"No, it's fine\" while the cooling stays is the answer. You can't repair what they won't name.", twin: "Tells me plainly when something I did landed wrong" },
  { key: "noReciprocalEffort", name: "No reciprocal effort", tell: "Plans, calls, remembering, showing up: all yours.", test: "Do half. Leave the other half open for a month.", response: "If the half stays empty, the friendship was one person wide.", twin: "Meets effort with effort" },
  { key: "taker", name: "Taker", tell: "Reaches out when they need something. Warm when it's flowing their way.", test: "One small no. Then watch the temperature.", response: "Slow the giving, hold the pearls, match access to what they've shown.", twin: "Gives without being asked" },
  { key: "fragileEgo", name: "Fragile ego, never wrong", tell: "Every disagreement becomes a defense. Feedback becomes an attack on them.", test: "One tiny, low-stakes pushback, early, on purpose, before you've invested.", response: "What they do with it is the data. Defensiveness that never softens means peer conversations aren't possible here.", twin: "Can be wrong out loud, and stay warm" },
  { key: "gossip", name: "Gossips", tell: "They tell you about someone else. That's the whole tell.", test: "None needed.", response: "They never get a pearl. What they say to you about others, they'll say to others about you.", twin: "Speaks well of people who aren't in the room", hardLine: true },
  { key: "confidence", name: "Can't keep my information private", tell: "Something small you told them comes back from somewhere else.", test: "Share one small, harmless thing and see where it goes.", response: "Access moves out. Confidences aren't a second-chance category.", twin: "Keeps what I tell them", hardLine: true },
  { key: "teacher", name: "Correction and teaching as the main channel", tell: "You leave feeling smaller and instructed. A better-than-you tone.", test: "Share something you're proud of. Watch whether it gets celebrated or improved.", response: "Peer or nothing. Name it once; if the channel doesn't change, the layer does.", twin: "Talks to me as a peer" },
  { key: "noAccountability", name: "Won't take ownership of their impact", tell: "Every hurt has a reason that isn't them. \"I'm sorry you feel that way.\"", test: "Say once, small, how something landed. Watch for the word \"I.\"", response: "No ownership after being told plainly means no repair is coming. Adjust access; skip the second speech.", twin: "Owns their impact and repairs" },
  { key: "avoidant", name: "Emotionally unavailable and avoidant", tell: "Close, then gone. Depth followed by distance. You do the chasing.", test: "Stop chasing. Match their pace exactly for a month.", response: "Done chasing avoidants means done. Let the distance they choose be the layer they're in.", twin: "Stays present through closeness" },
  { key: "wontCommunicate", name: "Won't put in the work to communicate", tell: "Hints, silence, third parties, or nothing, instead of words to you.", test: "Ask for a plain conversation once.", response: "Adults who won't use words can't be in the close layers. That isn't a punishment; it's a fit.", twin: "Uses words, with me, when it's hard" },
  { key: "oneSided", name: "One-sided, I carry it", tell: "You'd be able to list everything you've done for them. They'd struggle to list one thing.", test: "Set it down for a season and see what stands.", response: "What stands without you carrying it is the real friendship. The rest was you.", twin: "Carries their half" },
  { key: "earTickle", name: "Only wants to be heard and agreed with", tell: "You are a mirror and a truth-speaker; they want an audience and an amen.", test: "Say one true thing they didn't ask for, kindly.", response: "If truth ends the warmth, the warmth was for the audience. Don't enable; don't perform.", twin: "Wants my truth, not just my ear" },
  { key: "bypassing", name: "Spiritual bypassing", tell: "Scripture, positivity, or \"God's got it\" used to skip feelings, accountability, or the hard conversation.", test: "Bring a real, unresolved thing and see if it gets sat with or spiritualized away.", response: "You can share faith with them and not your struggles. Keep the pearls that need a witness for people who can witness.", twin: "Sits in the hard thing with me, faith intact" },
  { key: "godScapegoat", name: "Makes God the scapegoat", tell: "Their own free will, choices and ownership get handed to God. \"God wants me to stay\" at a job that is wrecking them, with an out they chose not to take. Misery about being single while turning everyone away, or fixed on the one who doesn't want them. God gets credit for everything good, blame for everything bad, and the complaints come to you.", test: "Ask once, kindly: \"What would you choose if it were up to you?\" Then watch whether \"me\" ever enters the sentence.", response: "You can't partner with someone who won't partner with their own life, and you don't have to be the one they pour it out to. Stop being the complaint's landing place; that's the only lever you hold. Compassion from the layer that fits.", twin: "Partners with God: chooses, owns it, and moves" },
  { key: "selfHate", name: "Hates themselves and isn't working on it", tell: "Contempt for themselves, no movement, and it leaks onto everyone close.", test: "Time. Watch for any step toward help or change over a season.", response: "Compassion from a distance. Someone who can't love themselves well can't love you well yet; you can't do that work for them.", twin: "Loves themselves well enough to love me well" },
  { key: "wontBeHelped", name: "Won't let me help them", tell: "Always the helper, the saver, the one ministering; never the one cared for. Your help gets deflected.", test: "Offer one specific, small thing. \"Let me bring dinner Tuesday.\" See if it's allowed.", response: "A friendship that only flows one way isn't a friendship; it's a role. Their savior seat is theirs to leave. Stay a peer; don't audition to be rescued.", twin: "Lets me care for them too" },
  { key: "oneTopic", name: "One topic, and it isn't us", tell: "Every conversation is their kids, their job, their thing. You ask; they don't. There's no room in it for you.", test: "Bring one thing from your own life and see if it gets a single question back.", response: "A friendship needs two lives in it. Keep them at the layer where group time is enough; don't audition for a spot in a monologue.", twin: "Asks about my life, and is a whole person beyond one role" },
  { key: "victim", name: "Always the victim, always exhausted", tell: "Every story has them wronged and worn out, and every conversation is the pour-out. You leave carrying it.", test: "Once, kindly: \"What are you going to do about it?\" Then stop offering the couch.", response: "You are not the therapy friend or the trauma-dump friend. Stop being the landing place; that is the only lever you hold, and it's enough. Compassion from the layer that fits.", twin: "Carries their own life, and asks how mine is" },
  { key: "constantMotion", name: "Can't just sit with me", tell: "Every meeting needs an activity, a plan, a next thing. Stillness together makes them restless.", test: "Suggest nothing: a porch, a drive, coffee with no agenda. See if they can stay.", response: "Presence is the thing you're offering and the thing you need. If sitting together is never enough, the friendship lives in the doing-layers, not the close ones.", twin: "Can sit with me, and it's enough" },
  { key: "silentTreatment", name: "Silent treatment after honesty", tell: "You send something honest, confrontational or personal, and they leave you on read. Days, sometimes weeks, before a reply, if one comes.", test: "None to run; the silence is the test, and it's already been run on you. Note the date you sent it and the date they answered.", response: "Silence as punishment for honesty is its own answer. When the reply finally comes, don't pretend the weeks didn't. Say once, plainly, that the silence cost you; then match access to what they do with that.", twin: "Answers honesty with honesty, even when it's uncomfortable" },
  { key: "passiveAggressive", name: "Passive-aggressive, or my gut goes strange", tell: "Digs dressed as jokes, agreement that isn't, help that punishes, and a body that goes weird around them before your head has a reason.", test: "Name one dig plainly, once: \"That landed like a jab. Did you mean it?\" And trust the gut long enough to watch.", response: "Your body is data before it's a story. A gut that stays strange over weeks is enough to keep them in the outer layers without a case file.", twin: "Says what they mean, and my body settles around them" },
  { key: "contrarian", name: "Contrarian", tell: "Whatever you say, the other side. Disagreement as a personality; correction as connection.", test: "Say something true and small and watch whether it can simply be received.", response: "You don't have to win or be worn down. Peer conversation needs two people who can agree sometimes. Outer layers, or none.", twin: "Can simply receive what I say" },
  { key: "asksDoesntShare", name: "Asks deep, shares shallow", tell: "They ask personal questions and you answer; they answer yours with weather.", test: "Ask one real question back and wait. Then hold your next pearl until they've offered one.", response: "Depth has to be mutual or it's data collection. Match your sharing to theirs, exactly.", twin: "Shares as deeply as they ask" },
];

export function signalByKey(key: string, extra: Signal[] = []): Signal | undefined {
  return [...SIGNALS, ...extra].find((s) => s.key === key);
}

/** The person's list: built-ins minus the ones they switched off, plus their own. */
export function signalsFor(settings: { off?: unknown; custom?: unknown } | undefined): Signal[] {
  const off = new Set(Array.isArray(settings?.off) ? (settings!.off as string[]) : []);
  const custom = Array.isArray(settings?.custom) ? (settings!.custom as Signal[]).filter((s) => s && typeof s.key === "string" && typeof s.name === "string") : [];
  return [...SIGNALS.filter((s) => !off.has(s.key)), ...custom];
}

/** Sightings per signal on one person, newest day last. */
export function tally(notes: { signal?: string; day: string }[]): { key: string; count: number; days: string[] }[] {
  const by = new Map<string, string[]>();
  for (const n of notes) {
    if (!n.signal) continue;
    by.set(n.signal, [...(by.get(n.signal) ?? []), n.day]);
  }
  return [...by.entries()].map(([key, days]) => ({ key, count: days.length, days: days.sort() })).sort((a, b) => b.count - a.count);
}

/** The initiation ledger read plainly: of the last few contacts, who reached out. */
export function initiationRead(contacts: { by: "me" | "them"; day: string }[], last = 6): { me: number; them: number; lastBy: "me" | "them" | null; lastDay: string | null } {
  const recent = [...contacts].sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-last);
  const me = recent.filter((c) => c.by === "me").length;
  const them = recent.length - me;
  const lastOne = recent[recent.length - 1];
  return { me, them, lastBy: lastOne?.by ?? null, lastDay: lastOne?.day ?? null };
}
