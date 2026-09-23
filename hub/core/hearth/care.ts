import type { TeachCard } from "./father";

/**
 * Her care and teaching shelf (The Mother's Table, 2026-09-23). Skin, hygiene,
 * hair and style, written for Jen: oily skin with large pores, a preference for
 * natural, simple, holistic care; hair to mid-back when wet, a blend of loose
 * waves and defined curls that falls flat with no product; autoimmune days that
 * need seated, no-heat, arms-down, spread-out routines. Pure content; the
 * screens render it. Nothing here is medical advice, and it says so once.
 */

// ---------- Skin ----------

export const SKIN_INTRO =
  "Oily skin with large pores is a skin type, not a flaw, and it ages slower than dry skin. The goal is balance, not stripping: skin that's stripped makes more oil. Simple, natural, consistent. One caution, said once: patch-test anything new on your jaw for two days, and if something stings, it's not for you.";

export interface RoutineStep {
  step: string;
  why: string;
}

export const SKIN_MORNING: RoutineStep[] = [
  { step: "Rinse with lukewarm water, or a pea of gentle cleanser if you woke up oily. Pat dry with a clean towel, don't rub.", why: "Morning skin mostly needs rinsing. Over-washing tells it to make more oil." },
  { step: "Toner, optional: cooled green tea on a cotton pad, or alcohol-free witch hazel.", why: "Green tea calms and helps with oil; witch hazel tightens the look of pores without drying." },
  { step: "A thin layer of aloe gel, or a light oil-free moisturizer.", why: "Oily skin still needs water. Skip this and it overcompensates by afternoon." },
  { step: "Mineral sunscreen (zinc oxide), a nickel-sized amount, even indoors by a window.", why: "Sun is what makes pores look bigger over time. Zinc is the calm one for reactive skin, and it doubles as a light primer." },
];

export const SKIN_EVENING: RoutineStep[] = [
  { step: "Oil cleanse: a teaspoon of jojoba oil massaged into dry skin for a minute, then a warm damp cloth to wipe it off.", why: "Jojoba is the closest thing to your own sebum, so it dissolves the day's oil and sunscreen without stripping. Skip coconut oil on the face; it clogs." },
  { step: "Then a gentle cleanser with water, if you wore sunscreen or makeup. Once is enough on a bare day.", why: "Two steps on makeup days, one on bare days. That's the whole rule." },
  { step: "Toner, same as morning, optional.", why: "Only if your skin feels tight or shiny. It shouldn't feel either after a good cleanse." },
  { step: "A few drops of a light serum if you use one (niacinamide is the one oily skin likes), or straight to moisturizer.", why: "Niacinamide is a vitamin, it's gentle, and it visibly helps pores and oil over about eight weeks. Optional, not required." },
  { step: "Aloe gel or a light moisturizer. Done.", why: "Four minutes. If you only do the oil cleanse and moisturizer, that still counts as a full routine." },
];

export const SKIN_WEEKLY: TeachCard[] = [
  { key: "clay", title: "Clay mask, once a week", lead: "Bentonite or kaolin clay, ten minutes.", body: [
    "A teaspoon of clay mixed with water or cooled green tea to a yogurt texture. Apple cider vinegar instead of water if your skin isn't sensitive.",
    "Thin layer, ten minutes, rinse before it fully cracks. Fully dry clay pulls too much.",
    "It draws oil out of pores and calms the shine for days. Then moisturize, always.",
    "On a flare or when skin is angry, skip it. Masks are for calm weeks.",
  ] },
  { key: "honey", title: "Raw honey, when skin is upset", lead: "The gentle one.", body: [
    "A thin layer of raw honey on damp skin, ten to fifteen minutes, rinse warm.",
    "It's antibacterial and humectant: calms breakouts and hydrates without oil.",
    "Good for the week the clay would be too much.",
  ] },
  { key: "dont", title: "What not to do", lead: "The mistakes oily skin pays for.", body: [
    "No scrubs, no brushes, no 'squeaky clean.' Stripping makes more oil and bigger-looking pores.",
    "No alcohol toners, no coconut oil on the face, no hot water.",
    "Don't pick. Warm cloth, honey, patience.",
    "Don't add five products at once. One new thing, two weeks, then decide.",
  ] },
  { key: "flare", title: "On a flare day", lead: "The whole routine in ninety seconds.", body: [
    "A micellar water or a warm damp cloth over the face. Aloe gel. Done.",
    "If you can't lift your arms, a cleansing cloth from bed counts.",
    "Your skin will not fall apart from one lazy night. It might from a month of shame about it.",
  ] },
];

// ---------- Hygiene ----------

export const HYGIENE: TeachCard[] = [
  { key: "shower-order", title: "The shower, in order", lead: "So it's automatic, not a decision.", body: [
    "Warm, not hot. Hot water dries skin and can spike a POTS heart rate. A shower stool if standing is a lot; sitting to shower is normal, not sad.",
    "Hair first if it's a wash day (the Hair shelf has that). Otherwise clip it up.",
    "Body: a gentle, fragrance-free wash, hands or a soft cloth. Focus on underarms, under the breasts, groin, feet, and any folds. The rest just needs water.",
    "Face last, with the cool-down rinse, so it gets the gentlest water.",
    "Pat dry, lotion while skin is still damp, softest clothes. Sit for a minute before standing up fully if you're dizzy.",
  ] },
  { key: "sink-bath", title: "The sink bath", lead: "For days a shower is too much.", body: [
    "A basin or the sink with warm water, a cloth, and a towel. Sit down.",
    "Face, neck, underarms, under the breasts, groin, feet. That order, rinsing the cloth between areas, or a fresh cloth for the last two.",
    "Deodorant, clean underwear, dry shampoo or a scalp wipe for the hair.",
    "That's a full clean. It's what nurses do for people who can't get up, and it works.",
  ] },
  { key: "teeth", title: "Teeth without the fight", lead: "The two-minute version and the thirty-second version.", body: [
    "An electric toothbrush does the work; you hold it. Two minutes, morning and night, soft pressure. Sensitive toothpaste if anything zings.",
    "Floss picks, not string, kept by the couch or the bed. One pass at night, wherever you are.",
    "Thirty-second version for the bad nights: brush with water and no paste, or a xylitol gum and a rinse. Not perfect, better than nothing, and nothing is what shame usually produces.",
    "A tongue scrape in the morning if breath bothers you. Cheap, fast, oddly satisfying.",
  ] },
  { key: "sweat-folds", title: "Sweat, folds and skin that rubs", lead: "Nobody's mother tells them this.", body: [
    "Under the breasts, the groin, the inner thighs and the belly fold hold moisture and can get sore or yeasty. Dry them properly after washing; a hair dryer on cool works.",
    "Cornstarch-free powder or a zinc barrier cream on the days you'll sweat or walk a lot.",
    "Cotton underwear, changed daily, and a bra that's clean every couple of days. Sleep without one when you can.",
    "If a fold gets red, itchy or smells yeasty, keep it clean and dry and use an over-the-counter antifungal for two weeks. If it's not better, that's a doctor question.",
  ] },
  { key: "hair-wash-schedule", title: "How often to wash your hair", lead: "Less than you were told.", body: [
    "Wavy and curly hair does best washed every three to five days. Every day strips it flat.",
    "Between washes: scalp only, with a co-wash or a diluted shampoo, if it's itchy or oily. The lengths don't need it.",
    "Dry shampoo or a scalp wipe on flare days. A braid hides everything for two days.",
  ] },
  { key: "hands-feet", title: "Hands, feet, nails", lead: "Small things that make you feel cared for.", body: [
    "Nails short and filed once a week. Cuticle oil (jojoba again) at night, rubbed in while you watch something.",
    "Feet: a pumice in the shower once a week, lotion and socks at night. Cracked heels heal in two weeks of that.",
    "Hand lotion by every sink. Your hands do everything; they get to be soft.",
  ] },
  { key: "period", title: "Period care, plainly", lead: "The version a mother explains.", body: [
    "Change every four to six hours whatever you use. A period cup or disc, if you're curious, is one purchase and no monthly cost.",
    "Heat on the belly or low back, magnesium at night, and no apology for resting more.",
    "Wash with water only; soap inside is never needed. Cotton underwear. Track it in The Apothecary so flares and cycles show their pattern.",
    "Pain that stops your life is not normal and is worth a doctor's time. 'Everyone has cramps' is not an answer.",
  ] },
];

// ---------- Hair ----------

export type Glyph = "wash" | "comb" | "wet" | "pray" | "scrunch" | "plop" | "handsoff" | "diffuse" | "pineapple" | "bonnet" | "spray" | "clip" | "braid" | "claw" | "bowl" | "flat";

export interface HairStep {
  glyph: Glyph;
  text: string;
}

export interface HairCard {
  key: string;
  title: string;
  lead: string;
  /** Minutes of hands-on effort, honestly. */
  minutes: number;
  /** True when every step can be done sitting with arms mostly down. */
  seated: boolean;
  steps: HairStep[];
  tip?: string;
}

export const HAIR_INTRO =
  "Your hair is a blend of loose waves and real curls, mid-back when wet, and it falls flat without product because wave needs three things to hold: water, something to hold the shape, and being left alone while it dries. Every card here is built around those three, and around days when your arms and your energy aren't available.";

export const HAIR: HairCard[] = [
  { key: "washday", title: "Wash day, the kind way", lead: "Scalp gets the shampoo. Ends get the conditioner. Detangle in the conditioner, never dry.", minutes: 10, seated: true, steps: [
    { glyph: "wash", text: "Sulfate-free shampoo on the scalp only, fingertips (not nails), a minute of massage. Let the suds run down the lengths; don't scrub them." },
    { glyph: "comb", text: "Rinse. Conditioner from ears down, a generous amount. Detangle with fingers first, then a wide-tooth comb, from the ends up, while the conditioner is in." },
    { glyph: "bowl", text: "Optional 'squish to condish': cup water in your hands and squish it up into the conditioned hair until it feels like seaweed. This is where the wave starts." },
    { glyph: "wash", text: "Rinse with cool-ish water, leaving a little conditioner slip in. Don't touch it again with a towel yet." },
  ], tip: "A shower stool and a hand-held shower head make all of this seated and arms-down." },
  { key: "product", title: "Product while soaking wet", lead: "The step that decides whether it's wavy or flat. Wetter than feels right.", minutes: 4, seated: true, steps: [
    { glyph: "wet", text: "Still in the shower, or bent over a sink, hair dripping. If it has stopped dripping, wet it again. Product on damp hair makes frizz; on soaking hair it makes waves." },
    { glyph: "pray", text: "A leave-in or a little conditioner, then a medium-hold gel or mousse, glazed on with 'praying hands': hair flat between the palms, smoothed down from ears to ends. This closes the cuticle and holds the wave." },
    { glyph: "scrunch", text: "Scrunch upward, ends toward scalp, in a soft fist. You should hear it squelch. Ten or so scrunches around the head, sitting or bent over." },
    { glyph: "clip", text: "Optional: two or three small clips at the roots on the crown, standing the hair up a little, so it doesn't dry flat to your head." },
  ], tip: "Gel feels like a lot at first. The crunch comes out later. Too little product is why it went flat before." },
  { key: "plop", title: "Plop with a t-shirt", lead: "Sit down for twenty minutes and let the shirt do the work.", minutes: 2, seated: true, steps: [
    { glyph: "plop", text: "Lay a cotton t-shirt on a chair seat or your lap, sleeves toward you. Bend forward and set your hair down onto it in a pile, crown to the shirt." },
    { glyph: "plop", text: "Fold the bottom hem over the back of your head, then tie the sleeves behind your head or in front. Sit back up. Done." },
    { glyph: "handsoff", text: "Ten to twenty minutes, sitting. Then untie and don't touch. If it's a flare day, this is the whole style: untie and let it air dry." },
  ], tip: "Cotton towels make frizz. T-shirt or microfiber only, and never rub." },
  { key: "dry", title: "Air dry, hands off, then scrunch out the crunch", lead: "The hardest step is not touching it.", minutes: 1, seated: true, steps: [
    { glyph: "handsoff", text: "Let it dry completely without touching. Touching while damp breaks the wave into frizz. Clips at the crown can stay in while it dries." },
    { glyph: "scrunch", text: "When it's fully dry and feels crunchy, put a drop of oil (jojoba or argan) on your palms and scrunch upward to break the cast. Soft, defined, not crunchy." },
    { glyph: "flat", text: "If the roots dried flat: flip your head or tilt to each side and shake at the roots with your fingertips, not through the lengths." },
  ] },
  { key: "diffuse", title: "Diffuse, seated, low heat", lead: "Only if you can't wait. Arms resting, never above the shoulders for long.", minutes: 8, seated: true, steps: [
    { glyph: "diffuse", text: "Sit with your elbow on your knee or a table. Low heat, low speed, diffuser attachment. Hover, don't touch, for the first few minutes to set the cast." },
    { glyph: "diffuse", text: "Then cup sections into the diffuser bowl, hold ten seconds, release. Tilt your head to the side to bring hair to the diffuser instead of lifting the diffuser to the hair." },
    { glyph: "handsoff", text: "Stop at eighty percent dry and let the rest air dry. Fully diffused hair frizzes more." },
  ], tip: "Heat and effort both cost you on a flare day. Plop and air dry is always the gentler road." },
  { key: "sleep", title: "Sleep so it lasts", lead: "Day two and three hair is made the night before.", minutes: 1, seated: true, steps: [
    { glyph: "pineapple", text: "A loose 'pineapple': gather the hair at the very top of your head with a soft scrunchie, one loop only, so the waves hang forward. Or a loose braid if the pineapple pulls." },
    { glyph: "bonnet", text: "A silk or satin pillowcase, or a satin bonnet if you'll keep it on. Cotton pillowcases drink the moisture and rough up the cuticle." },
  ] },
  { key: "refresh", title: "Day two refresh", lead: "Water and a little product. Two minutes.", minutes: 2, seated: true, steps: [
    { glyph: "spray", text: "Spray bottle of water, or water with a splash of leave-in, misted until the hair is damp but not dripping." },
    { glyph: "scrunch", text: "A pea of gel or mousse on your palms, scrunch upward. Clip the crown if it's flat. Let it air dry or go." },
  ] },
  { key: "flat", title: "When it dries flat at the roots", lead: "The usual causes and the fixes.", minutes: 2, seated: true, steps: [
    { glyph: "clip", text: "Root clips while wet, three or four along the part and crown, taken out when dry." },
    { glyph: "flat", text: "Put product on with your head tilted or flipped so the roots aren't glued down by gravity while they dry." },
    { glyph: "wash", text: "Heavy conditioner near the scalp weighs it down. Keep conditioner from the ears down; scalp gets shampoo only." },
  ] },
  { key: "frizz", title: "Frizz: why, and what to do", lead: "Frizz is a wave that didn't get what it needed.", minutes: 0, seated: true, steps: [
    { glyph: "wet", text: "Not wet enough when product went on. Wetter next time." },
    { glyph: "handsoff", text: "Touched while drying. Hands off until it's dry and crunchy." },
    { glyph: "plop", text: "Cotton towel. T-shirt or microfiber, squeeze only." },
    { glyph: "spray", text: "Humid day: a little extra gel and a lighter leave-in. Dry day: a drop more oil at the end." },
  ] },
  { key: "protective", title: "Low-energy styles that protect the wave", lead: "For arms that are done and days that are long.", minutes: 3, seated: true, steps: [
    { glyph: "braid", text: "One loose side braid over the shoulder, elbows down. Two loose braids for sleep make soft waves the next day with nothing else done." },
    { glyph: "claw", text: "A claw clip: twist loosely, fold up, clip. Half-up with a small claw clip keeps the face clear and the wave intact underneath." },
    { glyph: "pineapple", text: "A low, loose bun with a scrunchie, never a tight elastic. Tight elastics break the hair and give you a headache on a POTS day." },
  ] },
  { key: "flareday", title: "Flare-day hair", lead: "Ninety seconds, from the bed if needed.", minutes: 1, seated: true, steps: [
    { glyph: "spray", text: "Dry shampoo or a scalp wipe at the roots. Or nothing." },
    { glyph: "braid", text: "One loose braid or a claw clip. Done. It will be there tomorrow." },
  ] },
  { key: "buy", title: "What to buy, and nothing else", lead: "A short list, mostly cheap, mostly natural.", minutes: 0, seated: true, steps: [
    { glyph: "wash", text: "A sulfate-free shampoo and a silicone-free conditioner. Silicones coat the hair so water can't get in, and water is what wave needs." },
    { glyph: "pray", text: "A leave-in (or just your conditioner) and a medium-hold gel with no drying alcohol. Aloe vera gel works as a light natural gel; flaxseed gel (next card) is the strong natural one." },
    { glyph: "plop", text: "A cotton t-shirt or a microfiber towel, a wide-tooth comb, three or four root clips, two soft scrunchies, a claw clip, and a satin pillowcase. A spray bottle. That's the whole kit." },
  ] },
  { key: "flax", title: "Make flaxseed gel", lead: "Ten minutes, two ingredients, the natural gel that actually holds.", minutes: 10, seated: false, steps: [
    { glyph: "bowl", text: "A quarter cup of whole flaxseeds in two cups of water. Bring to a boil, then simmer, stirring, five to seven minutes until it's the texture of egg white." },
    { glyph: "bowl", text: "Strain quickly through a fine sieve or old stocking into a jar while it's hot; it thickens as it cools. Optional: a teaspoon of aloe gel or a few drops of jojoba oil stirred in." },
    { glyph: "pray", text: "Keep it in the fridge, two weeks. Use it like gel on soaking-wet hair. Freeze extra in an ice-cube tray." },
  ], tip: "Have John make it on a flare week. It's the kind of thing he'd like being asked for." },
];

// ---------- Style intake and suggestions ----------

export interface StyleIntake {
  colors: string[];
  avoid: string[];
  sensory: string[];
  vibe: string[];
  makeup: "none" | "minimal" | "some" | "";
  playUp: string[];
  minutes: "2" | "5" | "15" | "";
  notes?: string;
}

export const EMPTY_INTAKE: StyleIntake = { colors: [], avoid: [], sensory: [], vibe: [], makeup: "", playUp: [], minutes: "", notes: "" };

export interface IntakeQuestion {
  key: keyof Omit<StyleIntake, "notes">;
  question: string;
  multi: boolean;
  options: string[];
}

export const INTAKE: IntakeQuestion[] = [
  { key: "colors", question: "Colors you actually reach for", multi: true, options: ["Olive and forest greens", "Cream and oat", "Rust and terracotta", "Mustard and ochre", "Navy", "Black", "Burgundy and plum", "Dusty rose", "Denim blues", "Warm browns"] },
  { key: "avoid", question: "What you never want to wear again", multi: true, options: ["Anything tight at the waist", "Bright neon", "Pastels", "Stiff fabrics", "Heels", "Shapewear", "Bras with underwire", "Anything that needs ironing", "Turtlenecks", "Big logos"] },
  { key: "sensory", question: "Sensory no-gos", multi: true, options: ["Tags", "Seams on the inside", "Wool that itches", "Fragrance", "Sticky or heavy makeup", "Tight sleeves", "Things touching my neck", "Jewelry that moves", "Cold metal", "Anything on my eyelashes"] },
  { key: "vibe", question: "The look you like on yourself", multi: true, options: ["Earthy and easy", "Cozy layers", "Classic and clean", "A little edgy", "Soft and romantic", "Outdoorsy", "Put-together in five minutes", "Whatever I can sleep in"] },
  { key: "makeup", question: "Makeup, honestly", multi: false, options: ["none", "minimal", "some"] },
  { key: "playUp", question: "What you like about your face", multi: true, options: ["Eyes", "Brows", "Lips", "Cheekbones", "Skin", "Hair", "Smile", "Not sure yet"] },
  { key: "minutes", question: "Minutes you realistically have on a normal morning", multi: false, options: ["2", "5", "15"] },
];

export interface Suggestion {
  title: string;
  lines: string[];
}

/** Turn the intake into a short set of suggestions. Pure; tested. */
export function styleSuggestions(i: StyleIntake): Suggestion[] {
  const out: Suggestion[] = [];
  const has = (list: string[], word: string) => list.some((x) => x.toLowerCase().includes(word));
  const warm = has(i.colors, "olive") || has(i.colors, "rust") || has(i.colors, "mustard") || has(i.colors, "brown") || has(i.colors, "cream");
  const cool = has(i.colors, "navy") || has(i.colors, "plum") || has(i.colors, "denim") || has(i.colors, "rose");

  // Palette
  const palette: string[] = [];
  if (i.colors.length) palette.push(`Your palette is already chosen: ${i.colors.slice(0, 4).join(", ").toLowerCase()}. Buy in those and everything matches everything.`);
  if (warm && !cool) palette.push("Warm and earthy suits you by your own vote. Gold-tone metal, cream instead of white, brown instead of black for shoes and belts.");
  if (cool && !warm) palette.push("You lean cool. Silver-tone metal, true white, black or navy as your base.");
  if (warm && cool) palette.push("You cross warm and cool, which means most colors work on you. Pick one base (brown or black) and let the rest play.");
  if (i.colors.length === 0) palette.push("Pick three colors you already own the most of. That's your palette. It's allowed to be that simple.");
  out.push({ title: "Your colors", lines: palette });

  // Clothes
  const clothes: string[] = [];
  if (has(i.avoid, "tight") || has(i.sensory, "waist") || has(i.avoid, "shapewear")) clothes.push("Elastic waists, wide-leg or straight pants, dresses that skim. Belts are optional and sit at the hip, not the waist.");
  if (has(i.sensory, "tags") || has(i.sensory, "seams")) clothes.push("Cut every tag the day you buy. Turn things inside out to check seams before buying. Tagless basics in your palette, three of each.");
  if (has(i.sensory, "neck") || has(i.avoid, "turtleneck")) clothes.push("Scoop, V, and boat necks. Open collars. Nothing that closes at the throat.");
  if (has(i.sensory, "wool")) clothes.push("Cotton, bamboo, Tencel, and fleece. Cashmere if you find it secondhand; it doesn't itch like wool.");
  if (has(i.vibe, "earthy") || has(i.vibe, "outdoorsy")) clothes.push("A canvas or waxed jacket, a chunky knit, boots you can walk in, one linen dress. That's an earthy wardrobe.");
  if (has(i.vibe, "cozy")) clothes.push("Layers that come off: a soft base, a cardigan or shacket, a scarf you don't mind losing. Layers are how a flare body dresses.");
  if (has(i.vibe, "classic")) clothes.push("A dark straight-leg pant, a good white or cream top, a blazer with stretch, loafers. Repeatable.");
  if (has(i.vibe, "edgy")) clothes.push("One black leather or faux-leather piece (jacket, boots, or a belt), silver, a dark lip on a day you feel it. Edge is one item, not an outfit.");
  if (has(i.vibe, "romantic")) clothes.push("Soft fabrics that move, a little lace at a hem, a dusty floral in your palette. Keep the shape simple so it reads grown, not costume.");
  if (has(i.vibe, "five") || has(i.vibe, "sleep")) clothes.push("Three complete outfits hung together as sets. Morning-you picks a hanger, not a decision.");
  if (has(i.avoid, "heels")) clothes.push("Flat boots, loafers, clean sneakers. A heel you can't walk in is a decoration, not a shoe.");
  if (has(i.avoid, "underwire")) clothes.push("Wireless bras and bralettes, or none. A soft bra in your skin tone under everything.");
  if (clothes.length === 0) clothes.push("Buy fewer, softer, better. Three outfits you love beat a closet of almost.");
  out.push({ title: "Clothes", lines: clothes });

  // Makeup
  const makeup: string[] = [];
  const min = i.minutes || "5";
  if (i.makeup === "none" || i.makeup === "") makeup.push("Skin care is your makeup. Sunscreen, a tinted lip balm if you like, brushed brows. That's a finished face.");
  if (i.makeup === "minimal") {
    makeup.push(`The ${min === "2" ? "two" : "five"}-minute face: mineral sunscreen as base, a cream blush tapped on with fingers (cheeks and a touch on lids), brows brushed up, a tinted balm. Cream products, not powders, on oily skin with big pores; powder settles into pores, cream skims over them.`);
    if (has(i.sensory, "eyelash") || has(i.sensory, "sticky")) makeup.push("Skip mascara. Curl the lashes if you want, or leave them. Clear brow gel does more for your face than mascara does.");
  }
  if (i.makeup === "some") {
    makeup.push("Base: mineral sunscreen, then a skin tint or a light foundation only where you want it (center of the face), blended out with fingers. Nothing heavy over large pores; it sinks in by noon.");
    makeup.push("Cream blush and a cream bronzer or contour, one stick each. Brows filled softly. A lip in a warm neutral for daily, one deeper shade for nights.");
    if (!has(i.sensory, "eyelash")) makeup.push("Mascara on top lashes only, tubing formula so it doesn't smudge or need scrubbing off.");
  }
  if (has(i.playUp, "eyes")) makeup.push("Eyes: a single warm shadow (bronze or taupe) smudged with a finger, lashes curled. That's it. Big eyes need less, not more.");
  if (has(i.playUp, "brows")) makeup.push("Brows: brushed up and set with clear gel. Fill only the tail, lightly. They frame everything.");
  if (has(i.playUp, "lips")) makeup.push("Lips: a tinted balm daily; one true color (rust, berry, or brick in your palette) for days you want to be seen.");
  if (has(i.playUp, "cheek")) makeup.push("Cheekbones: cream blush high on the cheek, blended up toward the temple, and a touch of highlight only if it's a matte-skin day.");
  if (has(i.playUp, "skin")) makeup.push("Skin: keep it bare and glowing. Sunscreen, a drop of oil on the high points, nothing else. Let it show.");
  if (has(i.playUp, "smile")) makeup.push("Smile: lips balmed, teeth brushed, done. A tinted balm in a warm shade makes teeth look brighter.");
  if (has(i.playUp, "hair")) makeup.push("Hair: on a good hair day, make it the whole look. Bare face, one earring, hair down.");
  if (has(i.sensory, "fragrance")) makeup.push("Fragrance-free everything. If you want a scent, one drop of an essential oil you like on a wrist, or none.");
  out.push({ title: "Face", lines: makeup });

  // Time
  out.push({ title: "The morning, in your minutes", lines: [
    min === "2" ? "Two minutes: sunscreen, tinted balm, hair in a claw clip or down from last night's pineapple, the hanger outfit. You're dressed." :
    min === "15" ? "Fifteen minutes: the full skin routine, cream blush and brows, a refresh spray on the hair and a scrunch, the outfit you chose last night, one earring or ring. Sit down for the last two minutes before you leave." :
    "Five minutes: sunscreen, cream blush, brows, balm. Hair refreshed with a spray and a scrunch or clipped. The outfit that's hung as a set. Water before you go.",
    "On a flare morning, the two-minute version is the real version. The others are for days that have room.",
  ] });

  if (i.notes?.trim()) out.push({ title: "In your words", lines: [i.notes.trim()] });
  return out;
}
