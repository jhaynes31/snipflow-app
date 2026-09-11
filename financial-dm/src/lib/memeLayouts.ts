/**
 * Template aware text placement for memes.
 *
 * imgflip tells us how many text boxes a template normally has, but not
 * where they go or what each one means. This curated guide fills that in
 * for the popular templates: for each text slot, what it represents in the
 * joke (so the writer fills it correctly) and where it sits on the image
 * (so the text lands on the sign, the panel, or the person it belongs to).
 * Positions are percentages of the image, matching the draggable boxes,
 * so John can still nudge anything by hand.
 */

export interface MemeSlot {
  /** Short name of what this slot represents, shown to the writer. */
  role: string;
  /** How the slot is normally used in the joke. */
  hint: string;
  /** Center of the text, percent from the left / top edge. */
  x: number;
  y: number;
  /** Max width as a percent of the image. */
  w: number;
  /** Dark text with no outline, for white areas like a sign or whiteboard. */
  dark?: boolean;
}

export interface MemeLayout {
  /** imgflip template id when known (stable across renames). */
  id?: string;
  name: string;
  /** One line on how the template is used. */
  usage: string;
  slots: MemeSlot[];
}

const top = (role = "Setup", hint = "the situation, stated plainly"): MemeSlot => ({ role, hint, x: 50, y: 8, w: 92 });
const bottom = (role = "Punchline", hint = "the turn that lands the point"): MemeSlot => ({ role, hint, x: 50, y: 90, w: 92 });

export const MEME_LAYOUTS: MemeLayout[] = [
  { id: "181913649", name: "Drake Hotline Bling", usage: "Drake rejects the top option and approves the bottom one.", slots: [
    { role: "Rejected", hint: "the common but worse choice", x: 75, y: 25, w: 46 },
    { role: "Approved", hint: "the smarter choice John would suggest", x: 75, y: 75, w: 46 },
  ] },
  { id: "87743020", name: "Two Buttons", usage: "A sweating man cannot choose between two buttons.", slots: [
    { role: "Left button", hint: "one tempting option", x: 28, y: 13, w: 34 },
    { role: "Right button", hint: "the other tempting option", x: 62, y: 7, w: 34 },
    { role: "The person", hint: "who is stuck choosing (optional)", x: 50, y: 92, w: 90 },
  ] },
  { id: "112126428", name: "Distracted Boyfriend", usage: "A man turns to look at another woman while his girlfriend glares.", slots: [
    { role: "The distraction", hint: "the shiny thing pulling attention", x: 27, y: 62, w: 34 },
    { role: "The person", hint: "who is being tempted", x: 62, y: 44, w: 30 },
    { role: "The neglected", hint: "the sensible thing being ignored", x: 87, y: 55, w: 24 },
  ] },
  { id: "129242436", name: "Change My Mind", usage: "A man at a table with a sign stating a bold opinion.", slots: [
    { role: "Sign", hint: "the bold, defensible claim written on the sign", x: 61, y: 56, w: 44, dark: true },
  ] },
  { id: "93895088", name: "Expanding Brain", usage: "Four levels of enlightenment from dim to galaxy brain.", slots: [
    { role: "Level 1", hint: "the basic move", x: 25, y: 12, w: 46 },
    { role: "Level 2", hint: "a step smarter", x: 25, y: 37, w: 46 },
    { role: "Level 3", hint: "smarter still", x: 25, y: 62, w: 46 },
    { role: "Level 4", hint: "the galaxy brain move John recommends", x: 25, y: 87, w: 46 },
  ] },
  { id: "124822590", name: "Left Exit 12 Off Ramp", usage: "A car swerves hard onto the exit instead of going straight.", slots: [
    { role: "Straight ahead", hint: "the sensible path", x: 30, y: 20, w: 34 },
    { role: "The exit", hint: "the detour people take instead", x: 70, y: 20, w: 34 },
    { role: "The car", hint: "who is swerving (optional)", x: 50, y: 88, w: 60 },
  ] },
  { id: "217743513", name: "UNO Draw 25 Cards", usage: "Do the thing on the card or draw 25; the player holds 25 cards.", slots: [
    { role: "The card", hint: "the simple thing people refuse to do", x: 27, y: 32, w: 40, dark: true },
    { role: "The player", hint: "who would rather draw 25", x: 76, y: 90, w: 44 },
  ] },
  { id: "222403160", name: "Bernie I Am Once Again Asking For Your Support", usage: "Bernie is once again asking for something.", slots: [
    { role: "Top", hint: "who is asking (optional)", x: 50, y: 8, w: 92 },
    { role: "Bottom", hint: "\"I am once again asking...\" the request", x: 50, y: 88, w: 92 },
  ] },
  { id: "188390779", name: "Woman Yelling At Cat", usage: "A woman yells while a cat sits calmly at a dinner table.", slots: [
    { role: "The woman", hint: "the panicked accusation or worry", x: 25, y: 10, w: 46 },
    { role: "The cat", hint: "the calm, factual reply", x: 75, y: 10, w: 46 },
  ] },
  { id: "438680", name: "Batman Slapping Robin", usage: "Robin starts a sentence and Batman slaps it out of him.", slots: [
    { role: "Robin", hint: "the bad idea being said", x: 26, y: 12, w: 44 },
    { role: "Batman", hint: "the correction", x: 74, y: 12, w: 44 },
  ] },
  { id: "247375501", name: "Buff Doge vs. Cheems", usage: "A strong doge (then) versus a weak cheems (now), or the reverse.", slots: [
    { role: "Buff Doge", hint: "the strong version", x: 25, y: 88, w: 46 },
    { role: "Cheems", hint: "the weak version", x: 75, y: 88, w: 46 },
  ] },
  { id: "1035805", name: "Boardroom Meeting Suggestion", usage: "A boss asks for ideas; the third answer gets thrown out the window.", slots: [
    { role: "The question", hint: "what the boss asks", x: 50, y: 8, w: 92 },
    { role: "Answer 1", hint: "a safe answer", x: 20, y: 62, w: 30 },
    { role: "Answer 2", hint: "another safe answer", x: 50, y: 62, w: 30 },
    { role: "Answer 3", hint: "the true answer nobody wants to hear", x: 80, y: 62, w: 30 },
  ] },
  { id: "131087935", name: "Running Away Balloon", usage: "A person reaches for a balloon while another holds them back.", slots: [
    { role: "The balloon", hint: "what they want", x: 72, y: 10, w: 40 },
    { role: "The person", hint: "who wants it", x: 28, y: 46, w: 40 },
    { role: "Holding back", hint: "what is stopping them", x: 62, y: 82, w: 44 },
  ] },
  { id: "102156234", name: "Mocking Spongebob", usage: "Mocking a silly statement by repeating it in alternating caps.", slots: [
    top("Normal line", "what someone says"),
    bottom("Mocked line", "the same idea, repeated mockingly"),
  ] },
  { id: "97984", name: "Disaster Girl", usage: "A girl smirks at the camera while a house burns behind her.", slots: [top("The scene", "what is burning"), bottom("The girl", "who lit the match")] },
  { id: "131940431", name: "Gru's Plan", usage: "Gru presents a plan that goes wrong on the last board.", slots: [
    { role: "Step 1", hint: "the plan", x: 30, y: 20, w: 40, dark: true },
    { role: "Step 2", hint: "the next step", x: 80, y: 20, w: 40, dark: true },
    { role: "Step 3", hint: "the flaw, read the first time", x: 30, y: 70, w: 40, dark: true },
    { role: "Step 3 again", hint: "the same flaw, realized", x: 80, y: 70, w: 40, dark: true },
  ] },
  { id: "100777631", name: "Is This A Pigeon", usage: "A man misidentifies a butterfly with total confidence.", slots: [
    { role: "The man", hint: "who is confused", x: 25, y: 78, w: 40 },
    { role: "The butterfly", hint: "what they are looking at", x: 78, y: 30, w: 36 },
    { role: "The question", hint: "\"Is this a ...?\" the wrong label", x: 50, y: 93, w: 92 },
  ] },
  { id: "27813981", name: "Hide the Pain Harold", usage: "A man smiles through pain.", slots: [top(), bottom()] },
  { id: "135256802", name: "Epic Handshake", usage: "Two very different people agree on one thing.", slots: [
    { role: "Left arm", hint: "one group", x: 18, y: 55, w: 30 },
    { role: "Right arm", hint: "a very different group", x: 82, y: 55, w: 30 },
    { role: "The handshake", hint: "the one thing they agree on", x: 50, y: 12, w: 60 },
  ] },
  { id: "55311130", name: "This Is Fine", usage: "A dog sips coffee in a burning room and says it is fine.", slots: [top("The fire", "the problem being ignored"), bottom("The dog", "who says this is fine")] },
  { id: "80707627", name: "Sad Pablo Escobar", usage: "Pablo waits alone, sad, in three scenes.", slots: [
    { role: "Scene 1", hint: "the waiting", x: 50, y: 8, w: 92 },
    { role: "Scene 2", hint: "still waiting", x: 25, y: 56, w: 46 },
    { role: "Scene 3", hint: "and waiting", x: 75, y: 56, w: 46 },
  ] },
  { id: "178591752", name: "Tuxedo Winnie The Pooh", usage: "Plain Pooh for the ordinary way, tuxedo Pooh for the classy way.", slots: [
    { role: "Plain Pooh", hint: "the ordinary way to say or do it", x: 75, y: 25, w: 46 },
    { role: "Tuxedo Pooh", hint: "the fancy version of the same thing", x: 75, y: 75, w: 46 },
  ] },
  { id: "252600902", name: "Always Has Been", usage: "An astronaut realizes the truth; the other says it always has been.", slots: [
    { role: "Realization", hint: "\"Wait, it's all ...?\"", x: 50, y: 10, w: 92 },
    { role: "Always has been", hint: "the calm confirmation", x: 50, y: 90, w: 92 },
  ] },
  { id: "4087833", name: "Waiting Skeleton", usage: "A skeleton has waited so long it turned to bone.", slots: [top("Waiting for", "the thing that never comes"), bottom("Still waiting", "how long it has been")] },
  { id: "61579", name: "One Does Not Simply", usage: "Boromir explains that one does not simply do the thing.", slots: [top("One does not simply", "\"One does not simply ...\""), bottom("The hard part", "why it is not simple")] },
  { id: "101470", name: "Ancient Aliens", usage: "A man blames everything on aliens.", slots: [top(), bottom("The explanation", "the absurd single cause")] },
  { id: "155067746", name: "Surprised Pikachu", usage: "Someone is shocked by the obvious consequence.", slots: [
    { role: "The setup", hint: "the choice, then the predictable result, as short lines", x: 50, y: 14, w: 92 },
  ] },
  { id: "89370399", name: "Roll Safe Think About It", usage: "Tapping the temple with flawed logic.", slots: [top("The logic", "the clever sounding loophole"), bottom("The catch", "why it seems to work")] },
  { id: "180190441", name: "They're The Same Picture", usage: "Pam is asked to spot the difference between two identical things.", slots: [
    { role: "Left picture", hint: "one thing", x: 30, y: 30, w: 34, dark: true },
    { role: "Right picture", hint: "the other thing that is really the same", x: 72, y: 30, w: 34, dark: true },
    { role: "Pam", hint: "\"They're the same picture\" (optional)", x: 50, y: 93, w: 92 },
  ] },
  { id: "226297822", name: "Panik Kalm Panik", usage: "Panic, then calm, then panic again.", slots: [
    { role: "Panik", hint: "the first scare", x: 25, y: 16, w: 46 },
    { role: "Kalm", hint: "the reassuring thought", x: 25, y: 50, w: 46 },
    { role: "Panik", hint: "the real problem", x: 25, y: 84, w: 46 },
  ] },
  { id: "148909805", name: "Monkey Puppet", usage: "Awkward side eye.", slots: [top("The situation", "what was said"), bottom("The look", "the awkward realization")] },
  { id: "322841258", name: "Anakin Padme 4 Panel", usage: "Padme assumes the best, Anakin's silence says otherwise.", slots: [
    { role: "Anakin", hint: "the plan, stated confidently", x: 25, y: 8, w: 46 },
    { role: "Padme", hint: "\"... right?\" the hopeful assumption", x: 75, y: 8, w: 46 },
    { role: "Anakin", hint: "silence (leave short or blank)", x: 25, y: 58, w: 46 },
    { role: "Padme", hint: "\"... right?\" again, worried", x: 75, y: 58, w: 46 },
  ] },
  { id: "6235864", name: "Bike Fall", usage: "A cyclist jams a stick in his own wheel and blames someone else.", slots: [
    { role: "The cyclist", hint: "who is riding along fine", x: 50, y: 12, w: 92 },
    { role: "The stick", hint: "the self inflicted mistake", x: 50, y: 46, w: 92 },
    { role: "The blame", hint: "what gets blamed instead", x: 50, y: 82, w: 92 },
  ] },
  { id: "309868304", name: "Trade Offer", usage: "A trade offer: I receive X, you receive Y.", slots: [
    { role: "I receive", hint: "what John's side gets", x: 28, y: 44, w: 40 },
    { role: "You receive", hint: "what the viewer gets", x: 72, y: 44, w: 40 },
  ] },
  { id: "195515965", name: "Clown Applying Makeup", usage: "Each step of reasoning makes the person more of a clown.", slots: [
    { role: "Step 1", hint: "the first shaky decision", x: 72, y: 12, w: 50 },
    { role: "Step 2", hint: "doubling down", x: 72, y: 37, w: 50 },
    { role: "Step 3", hint: "further still", x: 72, y: 62, w: 50 },
    { role: "Step 4", hint: "full clown", x: 72, y: 87, w: 50 },
  ] },
  { id: "259237855", name: "Laughing Leo", usage: "Leo laughs at something.", slots: [top("The setup", "what was said"), bottom("The laugh", "why it is funny")] },
  { id: "61544", name: "Success Kid", usage: "A small win, celebrated.", slots: [top("The situation", "the setup"), bottom("The win", "the small victory")] },
  { id: "61520", name: "Futurama Fry", usage: "Not sure if X, or Y.", slots: [top("Not sure if", "\"Not sure if ...\""), bottom("Or", "\"or ...\"")] },
  { id: "8072285", name: "Doge", usage: "Doge phrases: such X, very Y, wow.", slots: [top("Such", "\"such ...\""), bottom("Wow", "\"very ... wow\"")] },
  { id: "61585", name: "Bad Luck Brian", usage: "Everything goes wrong for Brian.", slots: [top(), bottom("The bad luck", "how it went wrong")] },
  { id: "84341851", name: "Evil Kermit", usage: "Kermit's dark side whispers a bad idea.", slots: [
    { role: "Me", hint: "the sensible thought", x: 25, y: 88, w: 46 },
    { role: "Me to me", hint: "the tempting bad idea", x: 75, y: 88, w: 46 },
  ] },
  { id: "99683372", name: "Sleeping Shaq", usage: "Asleep to one thing, wide awake for another.", slots: [
    { role: "Asleep", hint: "what does not wake them", x: 50, y: 22, w: 92 },
    { role: "Awake", hint: "what gets them up instantly", x: 50, y: 72, w: 92 },
  ] },
  { id: "119139145", name: "Blank Nut Button", usage: "Slamming the button for the thing you always do.", slots: [
    { role: "The button", hint: "the thing they always do", x: 50, y: 72, w: 60 },
    { role: "Top", hint: "the situation (optional)", x: 50, y: 8, w: 92 },
  ] },
  { id: "161865971", name: "Marked Safe From", usage: "Facebook style: marked safe from X today.", slots: [
    { role: "Marked safe from", hint: "the thing they dodged today", x: 50, y: 42, w: 80, dark: true },
  ] },
  { id: "28251713", name: "Oprah You Get A", usage: "Oprah gives everyone the same thing.", slots: [top("You get a", "\"You get a ...\""), bottom("Everybody", "\"Everybody gets a ...\"")] },
  { id: "14371066", name: "Star Wars Yoda", usage: "Yoda says something wise, backwards.", slots: [top(), bottom("Yoda", "the wisdom, Yoda style")] },
  { id: "21735", name: "The Rock Driving", usage: "A passenger asks, The Rock reacts.", slots: [
    { role: "The question", hint: "what the passenger says", x: 50, y: 12, w: 92 },
    { role: "The reaction", hint: "the line that makes The Rock turn", x: 50, y: 62, w: 92 },
  ] },
  { id: "91538330", name: "X, X Everywhere", usage: "Buzz shows Woody that X is everywhere.", slots: [top("X", "the thing"), bottom("X everywhere", "\"... everywhere\"")] },
  { id: "114585149", name: "Inhaling Seagull", usage: "A seagull inhales and screams, in four panels.", slots: [
    { role: "Panel 1", hint: "quiet setup", x: 50, y: 12, w: 92 },
    { role: "Panel 2", hint: "inhaling", x: 50, y: 37, w: 92 },
    { role: "Panel 3", hint: "louder", x: 50, y: 62, w: 92 },
    { role: "Panel 4", hint: "the scream", x: 50, y: 87, w: 92 },
  ] },
  { id: "12403754", name: "Y'all Got Any More Of That", usage: "Dave Chappelle asks for more of something.", slots: [top("Y'all got any more of", "\"Y'all got any more of ...\""), bottom("The twist", "optional")] },
  { id: "101288", name: "Third World Skeptical Kid", usage: "A kid is not buying it.", slots: [top("The claim", "what was said"), bottom("The skepticism", "why it does not add up")] },
  { id: "5496396", name: "Leonardo Dicaprio Cheers", usage: "A toast to something.", slots: [top("Cheers to", "the toast"), bottom("The reason", "optional")] },
  { id: "61539", name: "First World Problems", usage: "Crying over a small problem.", slots: [top("The problem", "the tiny problem"), bottom("The tears", "optional")] },
  { id: "61556", name: "Grandma Finds The Internet", usage: "Grandma discovers something online.", slots: [top(), bottom()] },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Find the curated layout for a template by imgflip id first, then by name. */
export function findLayout(template: { id?: string; name?: string } | null | undefined): MemeLayout | null {
  if (!template) return null;
  if (template.id) {
    const byId = MEME_LAYOUTS.find((l) => l.id === String(template.id));
    if (byId) return byId;
  }
  const n = norm(template.name || "");
  if (!n) return null;
  return MEME_LAYOUTS.find((l) => norm(l.name) === n) ?? MEME_LAYOUTS.find((l) => n.includes(norm(l.name)) || norm(l.name).includes(n)) ?? null;
}

/** Default slots when a template has no curated layout: top and bottom, then extra rows. */
export function defaultSlots(boxCount: number): MemeSlot[] {
  const n = Math.max(1, Math.min(boxCount || 2, 5));
  if (n === 1) return [top("Text", "the one line")];
  if (n === 2) return [top(), bottom()];
  return Array.from({ length: n }, (_, i) => ({
    role: `Line ${i + 1}`,
    hint: i === 0 ? "the setup" : i === n - 1 ? "the punchline" : "the next beat",
    x: 50,
    y: Math.round(8 + (84 * i) / (n - 1)),
    w: 92,
  }));
}

/** The slots the writer should fill for a template, curated or default. */
export function slotsFor(template: { id?: string; name?: string; boxCount?: number } | null | undefined): MemeSlot[] {
  return findLayout(template)?.slots ?? defaultSlots(template?.boxCount ?? 2);
}

/** Prompt lines describing how each listed template is used and what each slot means. */
export function layoutGuideLines(templates: Array<{ id?: string; name: string; boxCount?: number }>): string {
  return templates
    .map((t) => {
      const layout = findLayout(t);
      const slots = layout?.slots ?? defaultSlots(t.boxCount ?? 2);
      const slotText = slots.map((s, i) => `${i + 1}) ${s.role}: ${s.hint}`).join("; ");
      return `- ${t.name}${layout ? ` (${layout.usage})` : ""} | ${slots.length} text slot${slots.length === 1 ? "" : "s"}: ${slotText}`;
    })
    .join("\n");
}
