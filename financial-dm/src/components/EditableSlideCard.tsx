import { useRef, useLayoutEffect, useState } from "react";
import type { CSSProperties, PointerEvent as RPointerEvent } from "react";
import type { EditableSlide, SlideElement } from "~/lib/slideEditor";
import {
  borderContentPaddingClass,
  elementColor,
  roleClassName,
  slideBackgroundStyle,
  themeBorderImage,
} from "~/lib/slideEditor";

/** Clamp a drag offset (in slide percent) so text stays on the card. */
function clampOffset(v: number, limit = 60): number {
  return Math.max(-limit, Math.min(limit, v));
}

/**
 * Renders a single square slide card from the editable model. The card's
 * background art comes from slide.background and each text element is laid
 * out in its vertical placement zone with its own horizontal alignment.
 *
 * Text elements are draggable: pressing and dragging on any element records
 * an offset (stored on the element as offsetX/offsetY percentages of the
 * slide) that is applied as a translate on top of the element's default flex
 * spot. This keeps the balanced default layout intact until the owner
 * deliberately moves an element. The selected element gets a dashed outline.
 *
 * The ref is forwarded so html-to-image can capture the live DOM for PNG
 * exports, which means downloads always reflect current edits and the same
 * drag offsets.
 */
export default function EditableSlideCard({
  slide,
  className = "",
  refEl,
  onClick,
  onMoveElement,
}: {
  slide: EditableSlide;
  className?: string;
  refEl?: (el: HTMLDivElement | null) => void;
  onClick?: () => void;
  onMoveElement?: (elId: string, offsetX: number, offsetY: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [cardSize, setCardSize] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragRef = useRef<{
    elId: string;
    startX: number;
    startY: number;
    startOffX: number;
    startOffY: number;
  } | null>(null);

  // Measure the rendered card so pixel drag deltas can be converted to slide
  // percentages and back, keeping positions consistent across render sizes
  // (editor preview vs PNG export).
  useLayoutEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setCardSize(rect.width || 0);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const extendRef = (el: HTMLDivElement | null) => {
    rootRef.current = el;
    if (refEl) refEl(el);
  };

  const handlePointerDown = (
    e: RPointerEvent<HTMLDivElement>,
    el: SlideElement,
  ) => {
    if (!onMoveElement) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      elId: el.id,
      startX: e.clientX,
      startY: e.clientY,
      startOffX: el.offsetX ?? 0,
      startOffY: el.offsetY ?? 0,
    };
    setSelectedId(el.id);
  };

  const handlePointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const node = rootRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dxPct = ((e.clientX - d.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - d.startY) / rect.height) * 100;
    const offX = clampOffset(d.startOffX + dxPct);
    const offY = clampOffset(d.startOffY + dyPct);
    onMoveElement?.(d.elId, Math.round(offX * 10) / 10, Math.round(offY * 10) / 10);
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  // Translate an element from its default spot. cardSize is the slide edge
  // (aspect square), so both axes scale against the same reference and the
  // stored percentages map identically on preview and export.
  const elementTransform = (el: SlideElement): CSSProperties | undefined => {
    const ox = el.offsetX ?? 0;
    const oy = el.offsetY ?? 0;
    if (!ox && !oy) return undefined;
    if (!cardSize) return undefined;
    return {
      transform: `translate3d(${(cardSize * ox) / 100}px, ${
        (cardSize * oy) / 100
      }px, 0)`,
      position: "relative",
      zIndex: 2,
    };
  };

  const renderElement = (el: SlideElement) => {
    const selected = selectedId === el.id;
    // The Financial DM logo (public/logo.png, the "circle" emblem) sits just
    // under the brand line on every slide. It is a real DOM img so html-to-image
    // captures it in the PNG/ZIP export, and it renders inside the brand element
    // so dragging the brand moves the text and logo together.
    const content =
      el.role === "brand" ? (
        <span className="flex flex-col items-center gap-1.5 select-none">
          <span className={roleClassName(el.role)}>{el.text}</span>
          <span
            aria-hidden="true"
            className="inline-flex items-center justify-center rounded-full bg-black/40 p-[3px]"
          >
            <img
              src="/logo.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className="h-10 w-10 rounded-full object-contain"
            />
          </span>
        </span>
      ) : (
        el.text
      );
    return (
      <div
        key={el.id}
        role={el.role}
        onPointerDown={(e) => handlePointerDown(e, el)}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId(el.id);
        }}
        title={onMoveElement ? "Drag to reposition" : undefined}
        className={`${
          el.role === "brand" ? "" : roleClassName(el.role)
        } ${onMoveElement ? "cursor-move select-none touch-none" : ""} ${
          selected
            ? "outline outline-2 outline-dashed outline-[#c08020] rounded-sm"
            : ""
        }`}
        style={{
          textAlign: el.align,
          color: elementColor(el, slide.background, slide.themeBackground),
          ...elementTransform(el),
        }}
      >
        {content}
      </div>
    );
  };

  // Theme border overlay, if any. Rendered as a real DOM img inside the
  // captured node so both the on screen preview and the html-to-image PNG
  // export show the frame. pointer-events-none keeps it from ever blocking
  // text selection or drag to position, and z-index keeps it above the
  // background (the frame center is transparent, so text stays readable).
  const borderSrc = themeBorderImage(slide.themeBorder);

  return (
    <div
      ref={extendRef}
      // Clicking or dragging on empty slide area deselects any currently
      // selected element so the gold outline does not linger. Element pointer
      // downs stop propagation, so selecting/dragging a text element still
      // sets the selection as usual.
      onPointerDown={() => setSelectedId(null)}
      onClick={onClick}
      style={slideBackgroundStyle(slide)}
      className={`relative aspect-square w-full rounded-xl border border-[#b9803a]/45 flex flex-col overflow-hidden ${
        borderContentPaddingClass(slide.themeBorder) ?? "p-4 sm:p-5"
      } ${className}`}
    >
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        {slide.kind === "content" ? (
          /* Content slides: tag + heading + body sit together as one vertically
             centered unit with even, normal gaps, and the brand line is pinned
             to the bottom. Whitespace is shared symmetrically above and below,
             so there is no top pocket or bottom void. */
          <>
            <div className="flex-1 flex flex-col justify-center gap-[18px] min-h-0 overflow-hidden py-2">
              {slide.elements
                .filter((e) => e.role !== "brand")
                .map(renderElement)}
            </div>
            <div className="shrink-0 flex flex-col justify-center gap-1.5 min-h-0">
              {slide.elements
                .filter((e) => e.role === "brand")
                .map(renderElement)}
            </div>
          </>
        ) : (
          <>
            <div className="shrink-0 flex flex-col justify-center gap-3 min-h-0 pt-2">
              {slide.elements
                .filter((e) => e.vpos === "top")
                .map(renderElement)}
            </div>
            <div className="flex-1 flex flex-col justify-center gap-1.5 min-h-0 overflow-hidden py-3 sm:py-4">
              {slide.elements
                .filter((e) => e.vpos === "middle")
                .map(renderElement)}
            </div>
            <div className="shrink-0 flex flex-col justify-center gap-1.5 min-h-0">
              {slide.elements
                .filter((e) => e.vpos === "bottom")
                .map(renderElement)}
            </div>
          </>
        )}
      </div>
      {borderSrc && (
        <img
          src={borderSrc}
          alt=""
          aria-hidden="true"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-[3] select-none"
        />
      )}
    </div>
  );
}
