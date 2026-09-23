/**
 * The Apothecary's content and pattern math. Pure and self-contained.
 * Body areas with what the holistic traditions say they hold (Chinese
 * medicine meridians and somatic work, offered as tradition), the daily
 * factors that get tracked, the conditions Jen shows signs of, the red
 * flags that mean "a person, today," and the co-occurrence math that turns
 * weeks of entries into pattern lines.
 */

export interface Area {
  key: string;
  name: string;
  /** Chinese medicine: the meridian or organ system that runs here. */
  meridian: string;
  /** What the traditions say this place tends to hold. Offered, never declared. */
  holds: string;
}

export const AREAS: Area[] = [
  { key: "head", name: "Head", meridian: "Gallbladder and Bladder meridians cross the scalp; the Liver rises to the eyes.", holds: "Overthinking, holding it together, the effort of staying in control. Tension headaches sit where the jaw and neck brace." },
  { key: "eyes", name: "Eyes", meridian: "The Liver opens into the eyes.", holds: "What we can't bear to look at, and long stretches of vigilance." },
  { key: "jaw", name: "Jaw and face", meridian: "Stomach and Large Intestine meridians run the face; the jaw is where the Stomach channel turns.", holds: "Unsaid words, clenched decisions, anger held behind the teeth." },
  { key: "throat", name: "Throat", meridian: "The Lung and Stomach channels pass here; the throat is the fifth center in many traditions.", holds: "The voice: what was swallowed, what wasn't safe to say." },
  { key: "neck", name: "Neck", meridian: "Bladder and Gallbladder meridians down the back and sides; the Small Intestine along the shoulders.", holds: "Flexibility of view; carrying the head through a hard season; watching for what's coming." },
  { key: "shoulders", name: "Shoulders", meridian: "Gallbladder, Small Intestine and Triple Burner meet at the shoulder.", holds: "Responsibility carried for others. What we hold up that isn't ours." },
  { key: "chest", name: "Chest", meridian: "Heart and Pericardium; the Lung fills the upper chest.", holds: "Grief and love, the heart's guard. Shallow breath after fear. The Lung is where sorrow lives in Chinese medicine." },
  { key: "upperBack", name: "Upper back", meridian: "The Bladder meridian's inner line carries the back-shu points of Lung and Heart.", holds: "What's behind us that we haven't turned to face. Grief carried where we can't see it." },
  { key: "stomach", name: "Stomach and digestion", meridian: "Stomach and Spleen: the center, where food becomes us.", holds: "Worry and over-thinking (the Spleen's emotion), and what we can't stomach. The gut is also the nervous system's second home, and it keeps score." },
  { key: "liver", name: "Right side, under the ribs", meridian: "The Liver: free flow of qi and blood, the planner and the general.", holds: "Anger, frustration, and the stuckness of plans that can't move. The Liver governs the tendons and the smooth flow of everything." },
  { key: "lowBack", name: "Lower back", meridian: "The Kidney's back-shu points and the Bladder meridian; the gate of vitality (Ming Men).", holds: "Fear, and the reserves: what we draw on when we've run on empty too long. Support, and whether we had any." },
  { key: "hips", name: "Hips and pelvis", meridian: "Gallbladder and Liver channels wrap the hip; the Kidney and Spleen rise through the inner thigh.", holds: "What we sat on to survive. Old fear and shame; the body's storage room. Hips loosen when it's finally safe." },
  { key: "hands", name: "Hands and wrists", meridian: "Six meridians begin or end in the fingers: Lung, Large Intestine, Pericardium, Triple Burner, Heart, Small Intestine.", holds: "Reaching and giving; what we grip; the work we can't put down." },
  { key: "arms", name: "Arms and elbows", meridian: "The Lung and Large Intestine run the outer arm; the Heart and Pericardium the inner.", holds: "Embrace and defense: what we hold close and what we hold off." },
  { key: "knees", name: "Knees", meridian: "Stomach, Spleen, Liver, Gallbladder and Kidney all cross the knee.", holds: "Pride and yielding; the Kidney's fear shows here as weakness. Knees are where hypermobile bodies most often say so." },
  { key: "calves", name: "Calves and shins", meridian: "The Bladder meridian runs the calf; the Stomach the shin; the Spleen the inner leg.", holds: "Moving forward, and the fear of it. The Bladder channel carries the body's long braced line from the eyes to the little toe. Calves also pool blood when the vessels are loose or standing is long." },
  { key: "ankles", name: "Ankles and feet", meridian: "Kidney (inner ankle), Bladder (outer), and the springs of the Liver and Spleen at the big toe.", holds: "Ground, support, and where we stand. Swelling here is the body's plumbing before it's anything else." },
  { key: "skin", name: "Skin", meridian: "The Lung governs the skin and the body's surface defense (wei qi).", holds: "The boundary. Grief, and what got too close. In MCAS the skin is where histamine speaks first." },
  { key: "whole", name: "Whole body", meridian: "The Triple Burner: the coordination of everything.", holds: "Exhaustion of the reserves; a nervous system that never got the all-clear." },
  { key: "heartRate", name: "Heart rate, dizziness, standing", meridian: "Heart, and the Kidney's yang that lifts the blood.", holds: "Alarm without a cause in the room. The body still bracing for a danger that ended." },
];

export const QUALITIES = ["swelling", "pain", "ache", "sharp", "burning", "tingling", "numb", "heat", "cold", "tight", "weak", "itchy", "rash", "flushing", "racing", "dizzy", "fainting", "nausea", "fatigue", "brain fog", "stiff", "clicking", "subluxed"];

export const SIDES = ["left", "right", "both", "n/a"] as const;
export type Side = (typeof SIDES)[number];

export const ONSET = ["sudden", "gradual", "comes and goes", "constant"] as const;

/** The daily line: thirty seconds, chips only. */
export const FACTORS = [
  "slept badly",
  "slept well",
  "low water",
  "low salt",
  "long standing",
  "long sitting",
  "heat",
  "cold",
  "big stress",
  "calm day",
  "histamine foods",
  "alcohol",
  "sugar",
  "gluten",
  "dairy",
  "period",
  "pre-period",
  "ovulation",
  "exercise",
  "no movement",
  "new supplement",
  "new medication",
  "skipped meals",
  "travel",
];

export interface Condition {
  key: string;
  name: string;
  looksLike: string;
  overlaps: string;
  homeChecks: string[];
}

export const CONDITIONS: Condition[] = [
  {
    key: "pots",
    name: "POTS (postural tachycardia)",
    looksLike: "Heart races on standing, dizziness, brain fog, fatigue, purple or pooled feet and calves after standing, worse in heat, after showers, and when under-hydrated or under-salted.",
    overlaps: "Travels with hypermobility and MCAS so often the three are called the trifecta. Trauma-shaped nervous systems get read as anxiety when this is what's happening.",
    homeChecks: [
      "The lying-then-standing test: rest lying down ten minutes, take your pulse; stand still and take it at 1, 3, 5 and 10 minutes. A rise of 30 or more that stays is the POTS pattern. Write the numbers in an entry.",
      "Salt and water for a week: 3 liters and added salt (unless something else forbids it). Log whether standing gets easier.",
      "Compression on the calves and belly for a day, and see what changes.",
    ],
  },
  {
    key: "heds",
    name: "Hypermobility / Ehlers-Danlos",
    looksLike: "Joints that go past normal range or slip, easy bruising, stretchy or soft skin, chronic aches, clicking, injuries from ordinary movement, tired after holding posture.",
    overlaps: "Loose vessels make blood pool (POTS); the same connective tissue sits around mast cells (MCAS); chronic pain wears the nervous system.",
    homeChecks: [
      "The Beighton nine: touch the floor flat-handed with straight knees; bend each thumb to the forearm; bend each little finger past 90; straighten each elbow past 180; each knee past 180. Count them; 5 or more is the marker.",
      "Note which joints slip and when. A month of entries shows the pattern.",
    ],
  },
  {
    key: "mcas",
    name: "MCAS (mast cell activation)",
    looksLike: "Flushing, hives, itching, swelling, racing heart, gut upset, brain fog, reactions to foods, heat, smells, stress or pressure on the skin, often in waves.",
    overlaps: "Histamine heavy foods, many herbs, and some supplements make it worse; heat and stress do too. Trauma keeps mast cells on alert.",
    homeChecks: [
      "A histamine diary for two weeks: log histamine foods (aged, fermented, leftovers, alcohol, tomato, spinach, citrus, chocolate) against flares.",
      "Press a line on the forearm with a fingernail and watch for a raised welt in five minutes (dermatographia): a common mast cell tell.",
      "Throat or lip swelling, trouble breathing, or fainting with a reaction is a now thing. If you have been given an epinephrine pen, this is what it is for.",
    ],
  },
  {
    key: "cptsd",
    name: "CPTSD in the body",
    looksLike: "A nervous system that never got the all-clear: startle, bracing, shallow breath, gut trouble, sleep that doesn't restore, pain that moves, shutdown, and a body that reacts to safety as if it were danger.",
    overlaps: "Turns the volume up on everything else here. Settling the nervous system is a treatment for all of it, not a consolation prize.",
    homeChecks: ["Ten slow breaths with a long exhale before an entry, then rate it again. If it dropped two points, the nervous system was part of it.", "Tend's Ground Me and Then or Now live next door."],
  },
  {
    key: "autoimmune",
    name: "Autoimmune signs",
    looksLike: "Flares and remissions: joint pain that moves, fatigue that sleep doesn't fix, low fevers, rashes, dry eyes and mouth, hair loss, cold hands and feet, gut trouble.",
    overlaps: "Overlaps everything above, and the pattern over months is what points at which one, if any. Patterns here become the notes you bring to whoever eventually runs the blood work.",
    homeChecks: ["Log the flares with what preceded them. Thirty days of entries is more useful than any single visit.", "Morning stiffness lasting more than half an hour, and where, is worth its own entry."],
  },
];

/** The signs that mean a person, today or now. Plain, no hedging. */
export const RED_FLAGS: { sign: string; where: "now" | "today"; why: string }[] = [
  { sign: "Chest pain or pressure, especially with sweating, nausea, or pain into the arm or jaw", where: "now", why: "Heart. Call 911; don't drive yourself." },
  { sign: "Swelling, warmth, or deep ache in one calf and not the other", where: "today", why: "A blood clot until an ultrasound says otherwise. Urgent care or the ER today; the ER now if you're also short of breath or the chest hurts." },
  { sign: "Sudden shortness of breath, or coughing up blood", where: "now", why: "A clot in the lung, or the heart. 911." },
  { sign: "The worst headache of your life, sudden, or with a stiff neck, fever, confusion, or weakness on one side", where: "now", why: "Bleeding or infection around the brain. 911." },
  { sign: "Face drooping, arm weakness, slurred speech, sudden vision loss", where: "now", why: "Stroke. Note the time it started and call 911." },
  { sign: "Throat or tongue swelling, trouble breathing, or fainting during a reaction", where: "now", why: "Anaphylaxis. Epinephrine if you have it, then 911, even if it eases." },
  { sign: "Fainting with a head injury, or fainting more than once in a day", where: "today", why: "POTS faints are usually benign; a hit head or repeated faints need eyes on them." },
  { sign: "Fever over 103, or any fever with a stiff neck, rash that doesn't fade under a glass, or confusion", where: "now", why: "Serious infection." },
  { sign: "Belly pain that is severe, or in the lower right with fever, or with a rigid belly", where: "today", why: "Appendix, gallbladder, or worse. Today, and now if it's severe." },
  { sign: "Blood in vomit or black tarry stools", where: "today", why: "Bleeding inside. Today; now if you're dizzy with it." },
  { sign: "A joint that is hot, swollen, red and you can't move, with fever", where: "today", why: "Infection inside the joint moves fast." },
  { sign: "New numbness or weakness in both legs, or losing control of bladder or bowel", where: "now", why: "Spinal cord. Emergency." },
  { sign: "Thoughts of ending your life", where: "now", why: "Call or text 988. Need help now in The Shire tells John with one tap." },
];

// Patterns

export interface EntryLike {
  day: string;
  area: string;
}
export interface DayLike {
  day: string;
  factors: string[];
}

export interface PatternLine {
  area: string;
  factor: string;
  withFactor: number;
  symptomDays: number;
  ratio: number;
  text: string;
}

/**
 * For each area with at least three symptom days, which daily factors show
 * up on those days far more than on days in general. Plain ratios, no
 * statistics theater; a line is worth reading when the factor is on at
 * least 60% of symptom days and at least 1.5x its everyday rate.
 */
export function patterns(entries: EntryLike[], days: DayLike[], areaName: (key: string) => string): PatternLine[] {
  const byDay = new Map(days.map((d) => [d.day, new Set(d.factors)]));
  const loggedDays = days.length;
  if (loggedDays < 5) return [];
  const factorDays = new Map<string, number>();
  for (const d of days) for (const f of d.factors) factorDays.set(f, (factorDays.get(f) ?? 0) + 1);
  const out: PatternLine[] = [];
  const areas = [...new Set(entries.map((e) => e.area))];
  for (const area of areas) {
    const sDays = [...new Set(entries.filter((e) => e.area === area).map((e) => e.day))].filter((d) => byDay.has(d));
    if (sDays.length < 3) continue;
    for (const [factor, everyday] of factorDays) {
      const withFactor = sDays.filter((d) => byDay.get(d)!.has(factor)).length;
      const share = withFactor / sDays.length;
      const base = everyday / loggedDays;
      const ratio = base > 0 ? share / base : 0;
      if (share >= 0.6 && ratio >= 1.5 && withFactor >= 3) {
        out.push({ area, factor, withFactor, symptomDays: sDays.length, ratio, text: `${areaName(area)} showed up on ${withFactor} of ${sDays.length} days with "${factor}" (about ${Math.round(ratio * 10) / 10}x its usual rate).` });
      }
    }
  }
  return out.sort((a, b) => b.ratio - a.ratio);
}

export function areaName(key: string): string {
  return AREAS.find((a) => a.key === key)?.name ?? key;
}
