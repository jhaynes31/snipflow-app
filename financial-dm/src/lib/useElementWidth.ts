import { useEffect, useRef, useState } from "react";

/**
 * The live width of one element, for things that must scale with the box
 * they sit in (the quiz share cards are drawn at 1080 px and shrunk to fit).
 * Starts at the fallback so the server render and the first paint agree.
 */
export function useElementWidth<T extends HTMLElement>(fallback: number): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setWidth(el.getBoundingClientRect().width || fallback);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, width];
}
