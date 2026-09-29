"use client";

import { useRef, type TextareaHTMLAttributes } from "react";
import { toggleMark, type Mark } from "./rich";

/**
 * A textarea with a small B / I / U bar. Drop-in for <textarea>: same props,
 * same onChange. The buttons wrap the selection (or unwrap it) and the change
 * goes through the textarea's own input event, so controlled state updates
 * as if it had been typed. Ctrl or Cmd plus B, I, U do the same.
 */
export function RichTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function apply(mark: Mark) {
    const el = ref.current;
    if (!el) return;
    const { value, start, end } = toggleMark(el.value, el.selectionStart, el.selectionEnd, mark);
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
    el.setSelectionRange(start, end);
  }

  return (
    <span className="sh-richbox">
      <textarea
        ref={ref}
        {...props}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
            const k = e.key.toLowerCase();
            if (k === "b" || k === "i" || k === "u") { e.preventDefault(); apply(k); return; }
          }
          props.onKeyDown?.(e);
        }}
      />
      <span className="sh-richbar" role="toolbar" aria-label="Formatting">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => apply("b")} aria-label="Bold" title="Bold (Ctrl+B)"><strong>B</strong></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => apply("i")} aria-label="Italic" title="Italic (Ctrl+I)"><em>I</em></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => apply("u")} aria-label="Underline" title="Underline (Ctrl+U)"><u>U</u></button>
      </span>
    </span>
  );
}
