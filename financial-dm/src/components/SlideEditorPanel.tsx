import { useRef } from "react";
import type {
  EditableSlide,
  SlideElement,
  HAlign,
  VPos,
  CustomBackground,
} from "~/lib/slideEditor";
import {
  BACKGROUNDS,
  THEME_BACKGROUNDS,
  THEME_BORDERS,
  isCustomBackground,
} from "~/lib/slideEditor";
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

/**
 * Inline editor for a single slide: background picker plus text elements
 * with align, vertical position, textarea, custom text, remove, and an
 * option to apply the current background to every slide. Rendered directly
 * beneath the slide it edits.
 */
export default function SlideEditorPanel({
  slide,
  customBackgrounds = [],
  onSelectBackground,
  onUpdateElement,
  onAddCustom,
  onRemoveElement,
  onApplyBgToAll,
  onUploadBackground,
  onSelectThemeBackground,
  onSelectThemeBorder,
  onApplyThemeToAll,
}: {
  slide: EditableSlide;
  customBackgrounds?: CustomBackground[];
  onSelectBackground: (bgId: string, image?: string) => void;
  onUpdateElement: (elId: string, patch: Partial<SlideElement>) => void;
  onAddCustom: () => void;
  onRemoveElement: (elId: string) => void;
  onApplyBgToAll: (bgId: string, image?: string) => void;
  onUploadBackground: (image: string) => void;
  onSelectThemeBackground: (id: string | undefined) => void;
  onSelectThemeBorder: (id: string | undefined) => void;
  onApplyThemeToAll: (themeBackground?: string, themeBorder?: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const hasTheme = !!slide.themeBackground;

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

  const customCards = (customBackgrounds || []).map((cb) => ({
    id: cb.id,
    image: cb.image,
    label: cb.label,
  }));

  return (
    <div className="rounded-xl border border-[#c08020]/30 bg-[#111a28] p-4 space-y-4">
      {/* Background picker */}
      <div>
        <p className="text-[#c08020] font-bold font-fantasy text-sm mb-2">
          🖼️ Slide Background
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {BACKGROUNDS.map((bg) => {
            const active = slide.background === bg.id;
            return (
              <button
                key={bg.id}
                onClick={() => onSelectBackground(bg.id)}
                style={bg.style}
                className={`aspect-[4/3] rounded-lg border flex items-end justify-center p-1 transition-all ${
                  active
                    ? "border-[#c08020] ring-2 ring-[#c08020]"
                    : "border-[#406080]/40 hover:border-[#c08020]/60"
                }`}
                title={bg.label}
              >
                <span
                  className={`text-[9px] font-fantasy px-1 rounded ${
                    bg.light ? "text-[#1d2733]" : "text-[#e0e0e0]"
                  }`}
                >
                  {bg.label}
                </span>
              </button>
            );
          })}
          {customCards.map((cb) => {
            const active = slide.background === cb.id;
            return (
              <button
                key={cb.id}
                onClick={() => onSelectBackground(cb.id, cb.image)}
                style={{
                  backgroundImage: `url(${cb.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                className={`aspect-[4/3] rounded-lg border flex items-end justify-center p-1 transition-all ${
                  active
                    ? "border-[#c08020] ring-2 ring-[#c08020]"
                    : "border-[#406080]/40 hover:border-[#c08020]/60"
                }`}
                title={cb.label}
              >
                <span className="text-[9px] font-fantasy px-1 rounded text-[#e0e0e0] bg-black/50">
                  {cb.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              onApplyBgToAll(
                slide.background,
                isCustomBackground(slide.background)
                  ? slide.backgroundImage
                  : undefined,
              )
            }
            className="px-3 py-1.5 rounded-lg border border-[#406080]/30 text-[#a0a0a0] hover:text-[#e0e0e0] hover:bg-[#204060]/20 transition-all text-xs font-fantasy"
          >
            🎨 Apply this background to all slides
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 rounded-lg border border-[#c08020]/40 text-[#c08020] hover:bg-[#c08020]/15 transition-all text-xs font-fantasy"
          >
            ⬆️ Upload your own
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </div>

      {/* D&D Theme background picker */}
      <div>
        <p className="text-[#c08020] font-bold font-fantasy text-sm mb-2">
          🎨 D&D Theme
        </p>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => onSelectThemeBackground(undefined)}
            className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
              !hasTheme
                ? "border-[#c08020] ring-2 ring-[#c08020] text-[#c08020]"
                : "border-[#406080]/40 text-[#a0a0a0] hover:border-[#c08020]/60"
            }`}
            title="Back to a plain flat color background"
          >
            <span className="text-lg leading-none" aria-hidden="true">
              🎴
            </span>
            <span className="text-[9px] font-fantasy px-1 text-center leading-tight">
              Plain
            </span>
          </button>
          {THEME_BACKGROUNDS.map((tb) => {
            const active = slide.themeBackground === tb.id;
            return (
              <button
                key={tb.id}
                onClick={() => onSelectThemeBackground(tb.id)}
                style={{
                  backgroundImage: `url(${tb.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                className={`aspect-square rounded-lg border overflow-hidden flex items-end justify-center transition-all ${
                  active
                    ? "border-[#c08020] ring-2 ring-[#c08020]"
                    : "border-[#406080]/40 hover:border-[#c08020]/60"
                }`}
                title={tb.label}
              >
                <span className="text-[9px] font-fantasy px-1 rounded bg-black/50 text-[#e0e0e0] w-full text-center truncate">
                  {tb.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Decorative border picker */}
      <div>
        <p className="text-[#c08020] font-bold font-fantasy text-sm mb-2">
          🖼️ Border
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onSelectThemeBorder(undefined)}
            className={`aspect-square rounded-lg border flex items-center justify-center transition-all text-[10px] font-fantasy px-1 ${
              !slide.themeBorder
                ? "border-[#c08020] ring-2 ring-[#c08020] text-[#c08020]"
                : "border-[#406080]/40 text-[#a0a0a0] hover:border-[#c08020]/60"
            }`}
            title="No decorative border"
          >
            No border
          </button>
          {THEME_BORDERS.map((tb) => {
            const active = slide.themeBorder === tb.id;
            return (
              <button
                key={tb.id}
                onClick={() => onSelectThemeBorder(tb.id)}
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundImage: `url(${tb.image})`,
                  backgroundSize: "100% 100%",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
                className={`aspect-square rounded-lg border overflow-hidden flex items-end justify-center transition-all ${
                  active
                    ? "border-[#c08020] ring-2 ring-[#c08020]"
                    : "border-[#406080]/40 hover:border-[#c08020]/60"
                }`}
                title={tb.label}
              >
                <span className="text-[9px] font-fantasy px-1 rounded bg-black/50 text-[#e0e0e0] w-full text-center truncate">
                  {tb.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-2">
          <button
            onClick={() =>
              onApplyThemeToAll(slide.themeBackground, slide.themeBorder)
            }
            disabled={!slide.themeBackground && !slide.themeBorder}
            className="px-3 py-1.5 rounded-lg border border-[#c08020]/40 text-[#c08020] hover:bg-[#c08020]/15 transition-all text-xs font-fantasy disabled:opacity-40"
          >
            🏰 Apply theme and border to all slides
          </button>
        </div>
      </div>

      {/* Text elements */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[#c08020] font-bold font-fantasy text-sm">
            ✍️ Text Elements
          </p>
          <button
            onClick={onAddCustom}
            className="px-3 py-1.5 rounded-lg bg-[#c08020]/15 border border-[#c08020]/40 text-[#c08020] hover:bg-[#c08020]/25 transition-all text-xs font-fantasy"
          >
            ➕ Add Custom Text
          </button>
        </div>

        <div className="space-y-4">
          {slide.elements.map((el, i) => (
            <div
              key={el.id}
              className="rounded-lg border border-[#406080]/25 bg-[#0d1520]/50 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#a0a0a0] text-[10px] font-fantasy uppercase tracking-wider">
                  {el.role === "custom"
                    ? "Custom text"
                    : el.role === "brand"
                      ? "Brand line"
                      : el.role === "tag"
                        ? "Slide tag"
                        : el.role === "heading"
                          ? "Heading"
                          : "Body"}
                  {el.role === "body" ? ` (line ${i + 1})` : ""}
                </span>
                {el.role === "custom" && (
                  <button
                    onClick={() => onRemoveElement(el.id)}
                    className="text-red-400/70 hover:text-red-400 text-xs font-fantasy"
                    title="Remove this text"
                  >
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

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-[#606080] text-[11px] font-fantasy mr-1">
                    Align
                  </span>
                  {ALIGN_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onUpdateElement(el.id, { align: opt.value })}
                      title={opt.label}
                      className={`w-8 h-8 rounded-md border flex items-center justify-center text-xs transition-all ${
                        el.align === opt.value
                          ? "border-[#c08020] bg-[#c08020]/20"
                          : "border-[#406080]/30 text-[#a0a0a0] hover:border-[#c08020]/50"
                      }`}
                    >
                      {opt.icon}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[#606080] text-[11px] font-fantasy mr-1">
                    Position
                  </span>
                  {POSITION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onUpdateElement(el.id, { vpos: opt.value })}
                      title={opt.label}
                      className={`w-8 h-8 rounded-md border flex items-center justify-center text-xs transition-all ${
                        el.vpos === opt.value
                          ? "border-[#c08020] bg-[#c08020]/20"
                          : "border-[#406080]/30 text-[#a0a0a0] hover:border-[#c08020]/50"
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
    </div>
  );
}
