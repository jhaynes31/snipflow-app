import { forwardRef, useState, useRef, useCallback, useEffect } from "react";
import type { MemeTemplate } from "~/server/memeGenerator";

export interface TextBox {
  id: string;
  text: string;
  x: number; // percentage from left edge (0-100)
  y: number; // percentage from top edge (0-100)
  showBackground: boolean;
}

interface MemePreviewProps {
  template: MemeTemplate | null;
  topText?: string;
  bottomText?: string;
  size?: "sm" | "md" | "lg";
  editing?: boolean;
  onTopTextChange?: (text: string) => void;
  onBottomTextChange?: (text: string) => void;
  // New text-box system
  textBoxes?: TextBox[];
  onTextBoxesChange?: (boxes: TextBox[]) => void;
  interactive?: boolean;
}

const textShadowStyles: React.CSSProperties = {
  fontFamily: "'Impact', 'Arial Black', sans-serif",
  textShadow:
    "1.5px 1.5px 0 #000, -0.5px -0.5px 0 #000, 0.5px -0.5px 0 #000, -0.5px 0.5px 0 #000, 0.5px 0.5px 0 #000",
};

const fontSizeMap = {
  sm: "text-[0.48rem] sm:text-[0.6rem]",
  md: "text-[0.6rem] sm:text-[0.8rem]",
  lg: "text-[0.8rem] sm:text-[1.1rem]",
};

// ── Sub-components ──────────────────────────────────────────────────

interface DraggableTextBoxProps {
  box: TextBox;
  containerRef: React.RefObject<HTMLDivElement | null>;
  fontSize: string;
  onUpdate: (updated: TextBox) => void;
  onDelete: (id: string) => void;
}

function DraggableTextBox({
  box,
  containerRef,
  fontSize,
  onUpdate,
  onDelete,
}: DraggableTextBoxProps) {
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(box.text);
  const [hovered, setHovered] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Start editing when input appears
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (editing) return;
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;
      dragOffset.current = {
        x: clientX - rect.left - (box.x / 100) * rect.width,
        y: clientY - rect.top - (box.y / 100) * rect.height,
      };
    },
    [box.x, box.y, containerRef, editing],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (editing) return;
      e.stopPropagation();
      const touch = e.touches[0];
      if (!touch) return;
      setDragging(true);

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      dragOffset.current = {
        x: touch.clientX - rect.left - (box.x / 100) * rect.width,
        y: touch.clientY - rect.top - (box.y / 100) * rect.height,
      };
    },
    [box.x, box.y, containerRef, editing],
  );

  // Global move/up handlers attached to document via useEffect
  useEffect(() => {
    if (!dragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const boxEl = boxRef.current;
      if (!boxEl) return;
      const boxRect = boxEl.getBoundingClientRect();
      const newXPct = ((clientX - containerRect.left - dragOffset.current.x) / containerRect.width) * 100;
      const newYPct = ((clientY - containerRect.top - dragOffset.current.y) / containerRect.height) * 100;
      const halfWidthPct = (boxRect.width / 2) / containerRect.width * 100;
      const halfHeightPct = (boxRect.height / 2) / containerRect.height * 100;
      onUpdate({
        ...box,
        x: Math.max(halfWidthPct, Math.min(100 - halfWidthPct, newXPct)),
        y: Math.max(halfHeightPct, Math.min(100 - halfHeightPct, newYPct)),
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) handleMove(touch.clientX, touch.clientY);
    };

    const handleEnd = () => setDragging(false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [dragging, box, containerRef, onUpdate]);

  const commitEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed) {
      onUpdate({ ...box, text: trimmed });
    }
    setEditing(false);
  }, [editValue, box, onUpdate]);

  const handleTextClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) return;
      e.stopPropagation();
      setEditValue(box.text);
      setEditing(true);
    },
    [box.text, dragging],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitEdit();
      } else if (e.key === "Escape") {
        setEditing(false);
        setEditValue(box.text);
      }
    },
    [commitEdit, box.text],
  );

  return (
    <div
      ref={boxRef}
      className="absolute z-10"
      style={{
        left: `${box.x}%`,
        top: `${box.y}%`,
        transform: "translate(-50%, -50%)",
        cursor: dragging ? "grabbing" : "grab",
        userSelect: dragging ? "none" : undefined,
        zIndex: dragging ? 50 : 10,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative inline-block">
        {/* Controls (hover visible) */}
        <div
          className={`absolute -top-2 -right-2 flex gap-0.5 transition-opacity ${
            hovered || editing ? "opacity-100" : "opacity-0"
          }`}
          style={{ zIndex: 51, transform: "translateY(-100%)" }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ ...box, showBackground: !box.showBackground });
            }}
            className="w-5 h-5 flex items-center justify-center rounded bg-[#0d1520]/80 border border-[#406080]/50 text-white text-[10px] hover:bg-[#1a2535] transition-colors"
            title={box.showBackground ? "Hide background" : "Show background"}
          >
            {box.showBackground ? "⬛" : "⬜"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(box.id);
            }}
            className="w-5 h-5 flex items-center justify-center rounded bg-red-900/60 border border-red-700/40 text-red-200 text-[10px] hover:bg-red-800/80 transition-colors"
            title="Delete text box"
          >
            ✕
          </button>
        </div>

        {/* Text content */}
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleInputKeyDown}
            className={`text-white text-center uppercase leading-tight outline-none ${fontSize}`}
            style={{
              ...textShadowStyles,
              background: box.showBackground
                ? "rgba(0,0,0,0.35)"
                : "transparent",
              border: "1px solid rgba(192,128,32,0.5)",
              padding: box.showBackground ? "2px 8px" : "0",
              whiteSpace: "nowrap",
              minWidth: "60px",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            onClick={handleTextClick}
            className={`text-white text-center uppercase leading-tight ${fontSize}`}
            style={{
              ...textShadowStyles,
              background: box.showBackground
                ? "rgba(0,0,0,0.35)"
                : "transparent",
              padding: box.showBackground ? "2px 8px" : "0",
              whiteSpace: "nowrap",
              border: hovered
                ? "1px dashed rgba(192,128,32,0.5)"
                : "1px dashed transparent",
            }}
          >
            {box.text}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

const MemePreview = forwardRef<HTMLDivElement, MemePreviewProps>(
  (
    {
      template,
      topText = "",
      bottomText = "",
      size = "md",
      textBoxes,
      onTextBoxesChange,
      interactive = false,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const fontSize =
      fontSizeMap[size as keyof typeof fontSizeMap] || fontSizeMap.md;

    // Merge the forwarded ref with our internal ref
    const setRefs = useCallback(
      (el: HTMLDivElement | null) => {
        containerRef.current = el;
        if (typeof ref === "function") {
          ref(el);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }
      },
      [ref],
    );

    const handleUpdateBox = useCallback(
      (updated: TextBox) => {
        if (!textBoxes || !onTextBoxesChange) return;
        const next = textBoxes.map((b) => (b.id === updated.id ? updated : b));
        onTextBoxesChange(next);
      },
      [textBoxes, onTextBoxesChange],
    );

    const handleDeleteBox = useCallback(
      (id: string) => {
        if (!textBoxes || !onTextBoxesChange) return;
        onTextBoxesChange(textBoxes.filter((b) => b.id !== id));
      },
      [textBoxes, onTextBoxesChange],
    );

    const handleAddBox = useCallback(() => {
      if (!onTextBoxesChange) return;
      const currentBoxes = textBoxes || [];
      const newBox: TextBox = {
        id: crypto.randomUUID(),
        text: "New text",
        x: 50,
        y: 50,
        showBackground: false,
      };
      onTextBoxesChange([...currentBoxes, newBox]);
    }, [textBoxes, onTextBoxesChange]);

    // Build text boxes from legacy topText/bottomText props when no textBoxes array
    const effectiveBoxes: TextBox[] | undefined = interactive
      ? textBoxes
      : textBoxes && textBoxes.length > 0
        ? textBoxes
        : undefined;

    const containerClasses = "relative w-full overflow-hidden rounded-lg group";

    if (template) {
      return (
        <div
          ref={setRefs}
          className={containerClasses}
          style={{
            aspectRatio: `${template.width} / ${template.height}`,
            maxHeight: size === "lg" ? "380px" : size === "sm" ? "200px" : "280px",
          }}
        >
          <img
            src={template.url}
            alt={template.name}
            className="w-full h-full object-contain bg-black"
            loading="lazy"
            crossOrigin="anonymous"
          />

          {/* Interactive text-boxes mode */}
          {interactive && effectiveBoxes !== undefined ? (
            <>
              {effectiveBoxes.map((box) => (
                <DraggableTextBox
                  key={box.id}
                  box={box}
                  containerRef={containerRef}
                  fontSize={fontSize}
                  onUpdate={handleUpdateBox}
                  onDelete={handleDeleteBox}
                />
              ))}

              {/* Add Text button */}
              <button
                onClick={handleAddBox}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-lg bg-[#c08020]/80 hover:bg-[#c08020] text-[#0d1520] text-xs font-fantasy font-bold border border-[#c08020] shadow-lg transition-all opacity-80 hover:opacity-100"
              >
                + Add Text
              </button>
            </>
          ) : effectiveBoxes && effectiveBoxes.length > 0 ? (
            /* Static text-boxes mode */
            effectiveBoxes.map((box) => (
              <div
                key={box.id}
                className="absolute pointer-events-none"
                style={{
                  left: `${box.x}%`,
                  top: `${box.y}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                }}
              >
                <div
                  className={`text-white text-center uppercase leading-tight ${fontSize}`}
                  style={{
                    ...textShadowStyles,
                    background: box.showBackground
                      ? "rgba(0,0,0,0.35)"
                      : "transparent",
                    padding: box.showBackground ? "2px 8px" : "0",
                    whiteSpace: "nowrap",
                  }}
                >
                  {box.text}
                </div>
              </div>
            ))
          ) : topText || bottomText ? (
            /* Legacy top/bottom display (backward compat, no interactive) */
            <>
              {topText && (
                <div
                  className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{ top: "12%" }}
                >
                  <div className="bg-black/35 py-1.5 px-3">
                    <p
                      className={`text-white text-center uppercase leading-tight ${fontSize}`}
                      style={textShadowStyles}
                    >
                      {topText}
                    </p>
                  </div>
                </div>
              )}
              {bottomText && (
                <div
                  className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{ bottom: "12%" }}
                >
                  <div className="bg-black/35 py-1.5 px-3">
                    <p
                      className={`text-white text-center uppercase leading-tight ${fontSize}`}
                      style={textShadowStyles}
                    >
                      {bottomText}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      );
    }

    // Fallback: dark box with text (no image)
    return (
      <div
        ref={setRefs}
        className="text-center px-3 py-2 rounded-lg bg-[#0d1520] border border-[#406080]/20"
        style={textShadowStyles}
      >
        {topText && (
          <p className="text-white uppercase leading-tight text-sm">{topText}</p>
        )}
        {bottomText && (
          <p className="text-white uppercase leading-tight mt-1 text-sm">
            {bottomText}
          </p>
        )}
      </div>
    );
  },
);

MemePreview.displayName = "MemePreview";
export default MemePreview;
