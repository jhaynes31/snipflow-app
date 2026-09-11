import { useEffect, useRef, useState } from "react";
import type { EditableSlide, SlideElement, HAlign, VPos, CustomBackground } from "~/lib/slideEditor";
import { BACKGROUNDS, TEXT_COLOR_PRESETS, THEME_BACKGROUNDS, THEME_BORDERS, elementColor, isCustomBackground } from "~/lib/slideEditor";
import type { ChangeEvent } from "react";

const ALIGN_OPTIONS: Array<{ value: HAlign; icon: string; label: string }> = [
  { value: "left", icon: "⬅️", label: "Align left" },
  { value: "center", icon: "⬆️", label: "Align center" },
  { value: "right", icon: "➡️", label: "Align right" },
];

const POSITION_OPTIONS: Array<{ value: VPos; icon: string; label: string }> = [
  { value: "top", icon: "🔼", label: "Place at top" },
  { value: "middle", icon: "⏺️", label: "Place in middle" },
  { value: "bottom", icon: "🔽", label: "Place at bottom" },
];

/** Everything that makes up a slide's look, copied as one unit by "apply to all". */
export interface SlideLook {
  background: string;
  backgroundImage?: string;
  themeBackground?: string;
  themeBorder?: string;
}

export function lookOf(slide: EditableSlide): SlideLook {
  return {
    background: slide.background,
    backgroundImage: isCustomBackground(slide.background) ? slide.backgroundImage : undefined,
    themeBackground: slide.themeBackground,
    themeBorder: slide.themeBorder,
  };
}

type Tab = "background" | "border" | "text";

/**
 * The slide editor, docked to the bottom of the screen so the slide being
 * edited stays in view while the picker scrolls on its own. Three tabs keep
 * it short: Background (plain colors and D&D scenes together), Border, and
 * Text. One button copies the whole look (background, scene, border) to
 * every slide.
 */
export default function SlideEditorPanel({
  slide,
  slideNumber,
  slideCount,
  customBackgrounds = [],
  onClose,
  onSelectBackground,
  onUpdateElement,
  onAddCustom,
  onRemoveElement,
  onUploadBackground,
  onSelectThemeBackground,
  onSelectThemeBorder,
  onApplyLookToAll,
  onColorAll,
  onColorAllSlides,
}: {
  slide: EditableSlide;
  slideNumber: number;
  slideCount: number;
  customBackgrounds?: CustomBackground[];
  onClose: () => void;
  /** A plain color or an uploaded image. The parent also clears any D&D scene. */
  onSelectBackground: (bgId: string, image?: string) => void;
  onUpdateElement: (elId: string, patch: Partial<SlideElement>) => void;
  onAddCustom: () => void;
  onRemoveElement: (elId: string) => void;
  onUploadBackground: (image: string) => void;
  onSelectThemeBackground: (id: string | undefined) => void;
  onSelectThemeBorder: (id: string | undefined) => void;
  onApplyLookToAll: (look: SlideLook) => void;
  /** Set (or clear, with undefined) the text color of every element on this slide. */
  onColorAll: (color: string | undefined) => void;
  /** Set (or clear) the text color of every element on every slide. */
  onColorAllSlides: (color: string | undefined) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<Tab>("background");
  const [tall, setTall] = useState(false);
  const [applied, setApplied] = useState(false);
  const [coloredAll, setColoredAll] = useState(false);
  const customColorRef = useRef<HTMLInputElement | null>(null);
  const elementColorRefs = useRef<Record<string, HTMLInputElement | null>>({});

  /** The slide's current text color when every element shares one; else none. */
  const slideColor = (() => {
    const colors = new Set(slide.elements.map((e) => e.color ?? ""));
    return colors.size === 1 ? [...colors][0] || undefined : null;
  })();

  const hasScene = !!slide.themeBackground;

  // On wide screens the editor docks to the right; this class shifts the page
  // content left (see app.css) so the slide is never covered.
  useEffect(() => {
    document.body.classList.add("slide-editor-open");
    return () => document.body.classList.remove("slide-editor-open");
  }, []);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (dataUrl) onUploadBackground(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const applyAll = () => {
    onApplyLookToAll(lookOf(slide));
    setApplied(true);
    setTimeout(() => setApplied(false), 1500);
  };

  const tabButton = (id: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-3 py-1.5 rounded-lg text-xs font-fantasy transition-all ${
        tab === id ? "bg-[#c08020] text-[#0d1520] font-bold" : "text-[#a0a0a0] hover:text-[#e0e0e0] hover:bg-[#204060]/30"
      }`}
      aria-pressed={tab === id}
    >
      {label}
    </button>
  );

  const swatches = (current: string | undefined | null, onPick: (color: string | undefined) => void, pickerRef: (el: HTMLInputElement | null) => void, size = "w-7 h-7") => (
    <div className="flex flex-wrap items-center gap-1.5">
      {TEXT_COLOR_PRESETS.map((c) => {
        const active = current !== null && (current ?? undefined) === c.value;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c.value)}
            title={c.label}
            aria-label={`Text color ${c.label}`}
            aria-pressed={active}
            data-text-color={c.id}
            className={`${size} rounded-full border-2 transition-all flex items-center justify-center text-[10px] ${
              active ? "border-[#c08020] ring-2 ring-[#c08020]/50 scale-110" : "border-[#406080]/60 hover:border-[#c08020]/70"
            }`}
            style={c.value ? { background: c.value } : { background: "linear-gradient(135deg,#ffffff 0 50%,#0d1520 50% 100%)" }}
          >
            {!c.value && <span className="sr-only">Auto</span>}
          </button>
        );
      })}
      <label className={`${size} rounded-full border-2 border-dashed border-[#406080]/60 hover:border-[#c08020]/70 flex items-center justify-center cursor-pointer text-xs`} title="Pick any color">
        🎨
        <input
          ref={pickerRef}
          type="color"
          className="sr-only"
          onChange={(e) => onPick(e.target.value)}
          aria-label="Pick any text color"
        />
      </label>
    </div>
  );

  const thumbClass = (active: boolean) =>
    `rounded-lg border overflow-hidden flex items-end justify-center transition-all ${
      active ? "border-[#c08020] ring-2 ring-[#c08020]" : "border-[#406080]/40 hover:border-[#c08020]/60"
    }`;

  return (
    <div
      className="fixed z-40 pointer-events-none inset-x-0 bottom-0 px-2 sm:px-4 lg:inset-x-auto lg:right-0 lg:top-0 lg:bottom-0 lg:px-0"
      data-slide-editor={slideNumber}
      role="region"
      aria-label={`Editing slide ${slideNumber} of ${slideCount}`}
    >
      <div
        className={`pointer-events-auto max-w-4xl mx-auto rounded-t-xl border border-b-0 border-[#c08020]/40 bg-[#111a28] shadow-[0_-12px_40px_rgba(0,0,0,0.55)] flex flex-col transition-[height] duration-200 lg:h-full lg:w-[372px] lg:max-w-none lg:mx-0 lg:rounded-none lg:rounded-l-xl lg:border-b lg:shadow-[-12px_0_40px_rgba(0,0,0,0.55)] ${
          tall ? "h-[82vh]" : "h-[46vh] sm:h-[44vh]"
        }`}
      >
        {/* Header: what is being edited, the tabs, apply to all, done */}
        <div className="shrink-0 border-b border-[#406080]/30 px-3 py-2 flex flex-wrap items-center gap-2">
          <span className="text-[#c08020] font-bold font-fantasy text-sm mr-1">
            ✏️ Slide {slideNumber} of {slideCount}
          </span>
          <div className="flex items-center gap-2 ml-auto lg:order-1">
            <button
              type="button"
              onClick={() => setTall((t) => !t)}
              className="w-8 h-8 rounded-lg border border-[#406080]/30 text-[#a0a0a0] hover:text-[#e0e0e0] text-xs lg:hidden"
              title={tall ? "Shorter panel" : "Taller panel"}
              aria-label={tall ? "Make the editor shorter" : "Make the editor taller"}
            >
              {tall ? "⤓" : "⤒"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-[#c08020] hover:bg-[#a06a18] text-[#0d1520] font-bold text-xs font-fantasy"
              data-editor-done
            >
              ✅ Done
            </button>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-[#0d1520]/70 p-0.5 lg:order-2 lg:w-full" role="tablist">
            {tabButton("background", "🎨 Background")}
            {tabButton("border", "🖼️ Border")}
            {tabButton("text", "✍️ Text")}
          </div>
          <button
            type="button"
            onClick={applyAll}
            className="px-3 py-1.5 rounded-lg border border-[#c08020]/40 text-[#c08020] hover:bg-[#c08020]/15 transition-all text-xs font-fantasy lg:order-3 lg:w-full"
            title="Copy this slide's background, scene, and border to every slide"
            data-apply-all
          >
            {applied ? "✅ Applied to all slides" : "🏰 Apply this look to all slides"}
          </button>
        </div>

        {/* Body: one tab at a time, scrolls on its own */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
          {tab === "background" && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[#a0a0a0] text-[11px] font-fantasy uppercase tracking-wider">Plain colors</p>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg border border-[#c08020]/40 text-[#c08020] hover:bg-[#c08020]/15 transition-all text-[11px] font-fantasy"
                  >
                    ⬆️ Upload your own
                  </button>
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-4 gap-1.5">
                  {BACKGROUNDS.map((bg) => {
                    const active = !hasScene && slide.background === bg.id;
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => onSelectBackground(bg.id)}
                        style={bg.style}
                        className={`aspect-[4/3] p-0.5 ${thumbClass(active)}`}
                        title={bg.label}
                        data-plain-bg={bg.id}
                        aria-pressed={active}
                      >
                        <span className={`text-[8px] font-fantasy px-0.5 rounded leading-tight ${bg.light ? "text-[#1d2733]" : "text-[#e0e0e0]"}`}>{bg.label}</span>
                      </button>
                    );
                  })}
                  {customBackgrounds.map((cb) => {
                    const active = !hasScene && slide.background === cb.id;
                    return (
                      <button
                        key={cb.id}
                        type="button"
                        onClick={() => onSelectBackground(cb.id, cb.image)}
                        style={{ backgroundImage: `url(${cb.image})`, backgroundSize: "cover", backgroundPosition: "center" }}
                        className={`aspect-[4/3] p-0.5 ${thumbClass(active)}`}
                        title={cb.label}
                        aria-pressed={active}
                      >
                        <span className="text-[8px] font-fantasy px-0.5 rounded text-[#e0e0e0] bg-black/50 leading-tight">{cb.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[#a0a0a0] text-[11px] font-fantasy uppercase tracking-wider mb-2">D&D scenes</p>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-4 gap-1.5">
                  {THEME_BACKGROUNDS.map((tb) => {
                    const active = slide.themeBackground === tb.id;
                    return (
                      <button
                        key={tb.id}
                        type="button"
                        onClick={() => onSelectThemeBackground(tb.id)}
                        style={{ backgroundImage: `url(${tb.image})`, backgroundSize: "cover", backgroundPosition: "center" }}
                        className={`aspect-square ${thumbClass(active)}`}
                        title={tb.label}
                        data-scene-bg={tb.id}
                        aria-pressed={active}
                      >
                        <span className="text-[8px] font-fantasy px-0.5 bg-black/55 text-[#e0e0e0] w-full text-center truncate leading-tight">{tb.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === "border" && (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => onSelectThemeBorder(undefined)}
                className={`aspect-square rounded-lg border flex items-center justify-center transition-all text-[10px] font-fantasy px-1 ${
                  !slide.themeBorder ? "border-[#c08020] ring-2 ring-[#c08020] text-[#c08020]" : "border-[#406080]/40 text-[#a0a0a0] hover:border-[#c08020]/60"
                }`}
                title="No decorative border"
                data-border="none"
                aria-pressed={!slide.themeBorder}
              >
                No border
              </button>
              {THEME_BORDERS.map((tb) => {
                const active = slide.themeBorder === tb.id;
                return (
                  <button
                    key={tb.id}
                    type="button"
                    onClick={() => onSelectThemeBorder(tb.id)}
                    style={{ backgroundImage: `url(${tb.image})`, backgroundSize: "100% 100%", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}
                    className={`aspect-square ${thumbClass(active)}`}
                    title={tb.label}
                    data-border={tb.id}
                    aria-pressed={active}
                  >
                    <span className="text-[8px] font-fantasy px-0.5 bg-black/55 text-[#e0e0e0] w-full text-center truncate leading-tight">{tb.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {tab === "text" && (
            <div>
              <div className="rounded-lg border border-[#406080]/25 bg-[#0d1520]/50 p-3 mb-3" data-slide-color>
                <p className="text-[#a0a0a0] text-[11px] font-fantasy uppercase tracking-wider mb-2">Text color for this slide</p>
                {swatches(slideColor, onColorAll, (el) => (customColorRef.current = el))}
                <p className="text-[#606080] text-[11px] font-fantasy mt-2">
                  Auto picks light or dark text for the background. Pick a swatch when it's hard to read, or 🎨 for any color.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onColorAllSlides(slideColor === null ? undefined : slideColor);
                    setColoredAll(true);
                    setTimeout(() => setColoredAll(false), 1500);
                  }}
                  className="mt-2 px-3 py-1.5 rounded-lg border border-[#c08020]/40 text-[#c08020] hover:bg-[#c08020]/15 transition-all text-xs font-fantasy"
                  data-color-all-slides
                >
                  {coloredAll ? "✅ Applied to all slides" : "🎨 Use this text color on all slides"}
                </button>
              </div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[#a0a0a0] text-[11px] font-fantasy uppercase tracking-wider">Text on this slide</p>
                <button
                  type="button"
                  onClick={onAddCustom}
                  className="px-3 py-1.5 rounded-lg bg-[#c08020]/15 border border-[#c08020]/40 text-[#c08020] hover:bg-[#c08020]/25 transition-all text-xs font-fantasy"
                >
                  ➕ Add Custom Text
                </button>
              </div>
              <div className="space-y-3">
                {slide.elements.map((el, i) => (
                  <div key={el.id} className="rounded-lg border border-[#406080]/25 bg-[#0d1520]/50 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#a0a0a0] text-[10px] font-fantasy uppercase tracking-wider">
                        {el.role === "custom" ? "Custom text" : el.role === "brand" ? "Brand line" : el.role === "tag" ? "Slide tag" : el.role === "heading" ? "Heading" : "Body"}
                        {el.role === "body" ? ` (line ${i + 1})` : ""}
                      </span>
                      {el.role === "custom" && (
                        <button type="button" onClick={() => onRemoveElement(el.id)} className="text-red-400/70 hover:text-red-400 text-xs font-fantasy" title="Remove this text">
                          🗑️ Remove
                        </button>
                      )}
                    </div>
                    <textarea
                      value={el.text}
                      onChange={(e) => onUpdateElement(el.id, { text: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-[#111a28] border border-[#406080]/40 text-[#e0e0e0] placeholder-[#606080] text-sm font-fantasy focus:outline-none focus:border-[#c08020]/50 resize-none"
                      placeholder="Type the text for this slide..."
                    />
                    <div className="flex items-center gap-2" data-element-color={el.id}>
                      <span className="text-[#606080] text-[11px] font-fantasy shrink-0">Color</span>
                      <span className="w-4 h-4 rounded-full border border-[#406080]/60 shrink-0" style={{ background: elementColor(el, slide.background, slide.themeBackground) }} aria-hidden="true" />
                      {swatches(el.color, (c) => onUpdateElement(el.id, { color: c }), (node) => (elementColorRefs.current[el.id] = node), "w-5 h-5")}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[#606080] text-[11px] font-fantasy mr-1">Align</span>
                        {ALIGN_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => onUpdateElement(el.id, { align: opt.value })}
                            title={opt.label}
                            className={`w-8 h-8 rounded-md border flex items-center justify-center text-xs transition-all ${
                              el.align === opt.value ? "border-[#c08020] bg-[#c08020]/20" : "border-[#406080]/30 text-[#a0a0a0] hover:border-[#c08020]/50"
                            }`}
                          >
                            {opt.icon}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[#606080] text-[11px] font-fantasy mr-1">Position</span>
                        {POSITION_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => onUpdateElement(el.id, { vpos: opt.value })}
                            title={opt.label}
                            className={`w-8 h-8 rounded-md border flex items-center justify-center text-xs transition-all ${
                              el.vpos === opt.value ? "border-[#c08020] bg-[#c08020]/20" : "border-[#406080]/30 text-[#a0a0a0] hover:border-[#c08020]/50"
                            }`}
                          >
                            {opt.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
