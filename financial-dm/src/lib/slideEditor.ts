import type { CSSProperties } from "react";

/**
 * Shared editable slide model for the Carousel Generator.
 *
 * Every slide is described by an ordered list of text elements, each with
 * its own horizontal alignment and vertical placement zone. A background id
 * picks the slide art. This same model is used to render the on-screen cards,
 * the PNG downloads (which capture the live DOM via html-to-image), and the
 * saved representation in the database.
 */

export type SlideKind = "cover" | "content" | "closing";
export type ElementRole = "brand" | "tag" | "heading" | "body" | "custom";
export type HAlign = "left" | "center" | "right";
export type VPos = "top" | "middle" | "bottom";

export interface SlideElement {
  id: string;
  role: ElementRole;
  text: string;
  align: HAlign;
  vpos: VPos;
  /**
   * Optional drag repositioning, stored as a percentage of the slide's
   * width (offsetX) and height (offsetY). These are the horizontal and
   * vertical translation applied on top of the element's default flex
   * layout spot (design A: offset on top of a good default). Absent or 0
   * means the element stays in its default anchored layout, so unedited
   * decks keep the balanced centered composition. Values may be negative
   * to move up or left and are clamped to keep text on the card.
   */
  offsetX?: number;
  offsetY?: number;
}

export interface EditableSlide {
  kind: SlideKind;
  background: string;
  /** Data URL of a user-uploaded custom background image (used alongside a "custom-" background id). */
  backgroundImage?: string;
  /**
   * Optional D&D theme texture id (one of THEME_BACKGROUNDS). When set it
   * overrides the flat gradient and any custom background image, rendering
   * the matching full-bleed texture from /themes/backgrounds. Undefined means
   * no theme, so the slide uses its regular flat/custom background.
   */
  themeBackground?: string;
  /**
   * Optional D&D decorative border frame id (one of THEME_BORDERS). When set
   * the matching transparent frame from /themes/borders is rendered as an
   * overlay hugging the slide edges. Undefined means no border.
   */
  themeBorder?: string;
  elements: SlideElement[];
}

export interface BackgroundOption {
  id: string;
  label: string;
  light: boolean;
  style: CSSProperties;
}

// ── Background art ──────────────────────────────────────────────────

export const BACKGROUNDS: BackgroundOption[] = [
  {
    id: "steel-gold",
    label: "Steel & Gold",
    light: false,
    style: { background: "linear-gradient(135deg, #1a2740 0%, #0d1520 100%)" },
  },
  {
    id: "gold-glow",
    label: "Gold Glow",
    light: false,
    style: {
      background:
        "radial-gradient(circle at 50% 32%, rgba(192,128,32,0.5) 0%, #1a2740 58%, #0d1520 100%)",
    },
  },
  {
    id: "dark-slate",
    label: "Dark Slate",
    light: false,
    style: { background: "linear-gradient(160deg, #232f42 0%, #101624 100%)" },
  },
  {
    id: "deep-blue",
    label: "Deep Blue",
    light: false,
    style: { background: "linear-gradient(150deg, #0d1b3a 0%, #050914 100%)" },
  },
  {
    id: "gold-fade",
    label: "Hearth Glow",
    light: false,
    style: {
      background:
        "linear-gradient(180deg, #1a2740 0%, #3a2f17 52%, #0d1520 100%)",
    },
  },
  {
    id: "parchment",
    label: "Parchment",
    light: true,
    style: {
      background: "linear-gradient(180deg, #f6eed9 0%, #e7dab9 100%)",
    },
  },
  {
    id: "brass-vein",
    label: "Brass Vein",
    light: false,
    style: {
      background:
        "linear-gradient(135deg, #4a3a1d 0%, #2b2418 45%, #14100a 100%)",
    },
  },
  {
    id: "titanium",
    label: "Titanium",
    light: false,
    style: {
      background: "linear-gradient(150deg, #3c4652 0%, #1c232c 100%)",
    },
  },
  {
    id: "emerald-vale",
    label: "Emerald Vale",
    light: false,
    style: {
      background: "linear-gradient(150deg, #0f3d2e 0%, #062019 100%)",
    },
  },
  {
    id: "wine-cellar",
    label: "Wine Cellar",
    light: false,
    style: {
      background: "linear-gradient(145deg, #4a1520 0%, #1e0a10 100%)",
    },
  },
  {
    id: "obsidian-grotto",
    label: "Obsidian Grotto",
    light: false,
    style: {
      background: "linear-gradient(160deg, #20242b 0%, #06070a 100%)",
    },
  },
  {
    id: "marble-hall",
    label: "Marble Hall",
    light: true,
    style: {
      background: "linear-gradient(180deg, #f1ece2 0%, #d8cfc0 100%)",
    },
  },
];

/** Prefix for user-uploaded custom background ids. */
export const CUSTOM_BG_PREFIX = "custom-";

export function isCustomBackground(id: string): boolean {
  return id.startsWith(CUSTOM_BG_PREFIX);
}

/** A user-uploaded custom background surfaced in the picker. */
export interface CustomBackground {
  id: string;
  label: string;
  image: string; // data URL
}

/**
 * Collect distinct custom backgrounds referenced by a deck, so the picker can
 * offer them as reusable options in the same grid as the built-ins.
 */
export function collectCustomBackgrounds(
  deck: EditableSlide[],
): CustomBackground[] {
  const map = new Map<string, string>();
  (deck || []).forEach((s) => {
    if (isCustomBackground(s.background) && s.backgroundImage) {
      map.set(s.background, s.backgroundImage);
    }
  });
  return Array.from(map.entries()).map(([id, image]) => ({
    id,
    label: "Your image",
    image,
  }));
}

export function backgroundStyle(id?: string): CSSProperties {
  return (
    BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0]
  ).style;
}

export function isLightBackground(id?: string): boolean {
  // Unknown/custom backgrounds default to dark so light text stays legible.
  if (!id || isCustomBackground(id)) return false;
  return BACKGROUNDS.find((b) => b.id === id)?.light ?? false;
}

/**
 * Resolve the CSS for a slide background. Custom backgrounds render the
 * uploaded image (cover), built-ins render their gradient/color style.
 */
export function backgroundStyleFor(
  background: string,
  image?: string,
): CSSProperties {
  if (isCustomBackground(background) && image) {
    return {
      backgroundImage: `url(${image})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundColor: "#0d1520",
    };
  }
  return backgroundStyle(background);
}

// ── D&D visual themes ──────────────────────────────────────────────
// Optional full-bleed texture backgrounds and decorative border frames
// served as static assets from /public/themes. These are separate from the
// flat BACKGROUNDS gradients and the user uploaded custom images.

export interface ThemeBackgroundOption {
  id: string;
  label: string;
  /** Static asset served from /public/themes/backgrounds. */
  image: string;
  /** True when the texture is bright enough that dark text reads best. */
  light: boolean;
}

export const THEME_BACKGROUNDS: ThemeBackgroundOption[] = [
  {
    id: "cracked-stone",
    label: "Cracked Stone",
    image: "/themes/backgrounds/cracked-stone.png",
    light: false,
  },
  {
    id: "dungeon-stone",
    label: "Dungeon Stone",
    image: "/themes/backgrounds/dungeon-stone.png",
    light: false,
  },
  {
    id: "dark-metal",
    label: "Dark Metal",
    image: "/themes/backgrounds/dark-metal.png",
    light: false,
  },
  {
    id: "golden-sky",
    label: "Golden Sky",
    image: "/themes/backgrounds/golden-sky.png",
    light: true,
  },
  {
    id: "deep-space",
    label: "Deep Space",
    image: "/themes/backgrounds/deep-space.png",
    light: false,
  },
  {
    id: "tree-bark",
    label: "Tree Bark",
    image: "/themes/backgrounds/tree-bark.png",
    light: false,
  },
  {
    id: "mossy-stone",
    label: "Mossy Stone",
    image: "/themes/backgrounds/mossy-stone.png",
    light: false,
  },
  {
    id: "obsidian",
    label: "Obsidian",
    image: "/themes/backgrounds/obsidian.png",
    light: false,
  },
];

export interface ThemeBorderOption {
  id: string;
  label: string;
  /** Static asset served from /public/themes/borders. */
  image: string;
}

export const THEME_BORDERS: ThemeBorderOption[] = [
  { id: "chains", label: "Chains", image: "/themes/borders/chains.png" },
  { id: "vines", label: "Vines", image: "/themes/borders/vines.png" },
  { id: "pillars", label: "Pillars", image: "/themes/borders/pillars.png" },
  { id: "gold", label: "Gold", image: "/themes/borders/gold.png" },
  { id: "moss", label: "Moss", image: "/themes/borders/moss.png" },
];

export function isThemeBackground(id?: string): boolean {
  return !!id && THEME_BACKGROUNDS.some((t) => t.id === id);
}

export function isThemeBorder(id?: string): boolean {
  return !!id && THEME_BORDERS.some((t) => t.id === id);
}

/** Resolve the static image for a theme background id. */
export function themeBackgroundImage(id?: string): string | undefined {
  return THEME_BACKGROUNDS.find((t) => t.id === id)?.image;
}

/** Resolve the static image for a theme border id. */
export function themeBorderImage(id?: string): string | undefined {
  return THEME_BORDERS.find((t) => t.id === id)?.image;
}

/**
 * Tailwind content-padding class per theme border, tuned so the slide's inner
 * text clears the opaque border ornament. The chains frame has a long inward
 * tail (clear only past ~12% of the slide edge), so it needs more headroom;
 * the compact frames (vines, pillars, gold, moss) are clear at 7.5%. Returns
 * undefined when there is no theme border, so the caller falls back to its
 * default slide padding.
 */
export function borderContentPaddingClass(id?: string): string | undefined {
  if (!id || !isThemeBorder(id)) return undefined;
  return id === "chains" ? "p-[13%]" : "p-[7.5%]";
}

/** CSS for a themed slide background (full-bleed texture, cover). */
export function themeBackgroundStyle(id: string): CSSProperties {
  return {
    backgroundImage: `url(${themeBackgroundImage(id)})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundColor: "#0d1520",
  };
}

/** Resolve the effective CSS background for a slide, honoring themes first. */
export function slideBackgroundStyle(slide: EditableSlide): CSSProperties {
  if (isThemeBackground(slide.themeBackground)) {
    return themeBackgroundStyle(slide.themeBackground as string);
  }
  return backgroundStyleFor(slide.background, slide.backgroundImage);
}

/** True when a theme background is bright enough that dark text reads best. */
export function isLightThemeBackground(id?: string): boolean {
  return THEME_BACKGROUNDS.find((t) => t.id === id)?.light ?? false;
}

// ── Default text colors, chosen per background so text stays legible ─

const DARK_PALETTE: Record<ElementRole, string> = {
  brand: "#c08020",
  tag: "#c08020",
  heading: "#eef2f7",
  body: "#aeb8c7",
  custom: "#eef2f7",
};

const LIGHT_PALETTE: Record<ElementRole, string> = {
  brand: "#8a5a10",
  tag: "#8a5a10",
  heading: "#1d2733",
  body: "#46525f",
  custom: "#1d2733",
};

export function elementColor(
  el: SlideElement,
  backgroundId?: string,
  themeBackgroundId?: string,
): string {
  const light = isThemeBackground(themeBackgroundId)
    ? isLightThemeBackground(themeBackgroundId)
    : isLightBackground(backgroundId);
  const palette = light ? LIGHT_PALETTE : DARK_PALETTE;
  return palette[el.role] ?? palette.heading;
}

export function roleClassName(role: ElementRole): string {
  switch (role) {
    case "brand":
      return "uppercase tracking-widest text-sm font-fantasy break-words line-clamp-1 overflow-hidden";
    case "tag":
      return "uppercase tracking-widest text-xs font-fantasy break-words line-clamp-1 overflow-hidden";
    case "heading":
      return "font-fantasy font-bold text-3xl sm:text-4xl leading-snug break-words line-clamp-4 overflow-hidden";
    case "body":
      return "font-fantasy text-xl sm:text-2xl lg:text-3xl leading-[1.6] break-words line-clamp-[14] overflow-hidden";
    case "custom":
      return "font-fantasy font-semibold text-lg sm:text-xl lg:text-2xl leading-snug break-words line-clamp-[10] overflow-hidden";
  }
}

// ── Building / parsing decks ────────────────────────────────────────

let uidCounter = 0;
export function uid(): string {
  uidCounter += 1;
  return `el${Date.now().toString(36)}${uidCounter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function makeElement(
  role: ElementRole,
  text: string,
  align: HAlign = "center",
  vpos: VPos = "middle",
): SlideElement {
  return { id: uid(), role, text, align, vpos };
}

interface ContentSource {
  title: string;
  fact: string;
  slides?: Array<{ heading: string; body: string }>;
  callToAction: string;
}

/**
 * Build the full editable deck (cover + content + closing) from a generated
 * carousel. This is the canonical, editable representation used for
 * rendering and saving.
 */
export function buildEditableDeck(src: ContentSource): EditableSlide[] {
  const deck: EditableSlide[] = [
    {
      kind: "cover",
      background: "steel-gold",
      elements: [
        makeElement("brand", "The Financial DM", "center", "top"),
        makeElement("heading", src.title, "center", "middle"),
        makeElement("body", `${src.fact}`, "center", "middle"),
      ],
    },
  ];

  (src.slides || []).forEach((s, i) => {
    // Keep the tag and heading up high, and let the body own the tall middle
    // band so it flows DOWN the slide and fills the vertical space.
    const elements: SlideElement[] = [
      makeElement("tag", `Slide ${i + 1}`, "center", "top"),
      makeElement("heading", s.heading, "center", "top"),
    ];
    if (s.body) elements.push(makeElement("body", s.body, "center", "middle"));
    elements.push(makeElement("brand", "The Financial DM", "center", "bottom"));
    deck.push({ kind: "content", background: "steel-gold", elements });
  });

  deck.push({
    kind: "closing",
    background: "steel-gold",
    elements: [
      makeElement("brand", "The Financial DM", "center", "top"),
      makeElement("heading", "Ready to level up?", "center", "middle"),
      makeElement("body", src.callToAction, "center", "middle"),
    ],
  });

  return deck;
}

/**
 * Parse the slides TEXT column back into an editable deck.
 *
 * Two formats are supported for backward compatibility:
 *  1. New: an array of EditableSlide objects (each has `elements`).
 *  2. Legacy: an array of { heading, body } content slides only, from which
 *     a full deck (cover + content + closing) is rebuilt on the fly.
 */
export function parseSavedDeck(
  raw: unknown,
  src: ContentSource,
): EditableSlide[] {
  if (!raw) return buildEditableDeck(src);
  let arr: unknown;
  try {
    arr = JSON.parse(String(raw));
  } catch {
    return buildEditableDeck(src);
  }
  if (!Array.isArray(arr) || arr.length === 0) return buildEditableDeck(src);

  const first = arr[0] as Record<string, unknown> | undefined;
  if (first && Array.isArray(first.elements)) {
    // New format: already an editable deck. Normalize defensively.
    return (arr as EditableSlide[])
      .map(normalizeSlide)
      .filter((s): s is EditableSlide => Boolean(s && s.elements.length > 0));
  }

  // Legacy format: plain content slides.
  const content = (arr as Array<Record<string, unknown>>)
    .map((s) => ({
      heading: String(s?.heading ?? ""),
      body: String(s?.body ?? ""),
    }))
    .filter((s) => s.heading || s.body);
  return buildEditableDeck({ ...src, slides: content });
}

function normalizeBackground(id: unknown): string {
  const s = String(id ?? "");
  if (BACKGROUNDS.some((b) => b.id === s)) return s;
  if (isCustomBackground(s)) return s;
  return "steel-gold";
}

function normalizeSlide(s: EditableSlide): EditableSlide | null {
  if (!s || !Array.isArray(s.elements)) return null;
  const kind: SlideKind =
    s.kind === "content" || s.kind === "closing" ? s.kind : "cover";
  const elements = s.elements
    .map((e): SlideElement | null =>
      e && typeof e.text === "string"
        ? {
            id: e.id || uid(),
            role: (["brand", "tag", "heading", "body", "custom"].includes(
              e.role,
            )
              ? e.role
              : "custom") as ElementRole,
            text: e.text,
            align: (["left", "center", "right"].includes(e.align)
              ? e.align
              : "center") as HAlign,
            vpos: (["top", "middle", "bottom"].includes(e.vpos)
              ? e.vpos
              : "middle") as VPos,
            offsetX:
              typeof e.offsetX === "number" && Number.isFinite(e.offsetX)
                ? e.offsetX
                : undefined,
            offsetY:
              typeof e.offsetY === "number" && Number.isFinite(e.offsetY)
                ? e.offsetY
                : undefined,
          }
        : null,
    )
    .filter((e): e is SlideElement => e !== null);
  return {
    kind,
    background: normalizeBackground(s.background),
    backgroundImage:
      typeof s.backgroundImage === "string" && s.backgroundImage
        ? s.backgroundImage
        : undefined,
    themeBackground:
      typeof s.themeBackground === "string" && isThemeBackground(s.themeBackground)
        ? s.themeBackground
        : undefined,
    themeBorder:
      typeof s.themeBorder === "string" && isThemeBorder(s.themeBorder)
        ? s.themeBorder
        : undefined,
    elements,
  };
}

/** Serialize an editable deck for storage in the slides TEXT column. */
export function serializeDeck(deck: EditableSlide[]): string {
  return JSON.stringify(deck || []);
}

/** Extract plain heading/body pairs (used for the plain text export). */
export function deckSummaries(
  deck: EditableSlide[],
): Array<{ heading: string; body: string }> {
  return (deck || []).map((s) => ({
    heading: s.elements.find((e) => e.role === "heading")?.text ?? "",
    body: s.elements.find((e) => e.role === "body")?.text ?? "",
  }));
}
