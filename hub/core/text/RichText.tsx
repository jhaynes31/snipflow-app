import { parseRich } from "./rich";

/** Typed text with its marks rendered: bold, italic, underline. Line breaks kept. */
export function Rich({ text, className }: { text: string; className?: string }) {
  const tokens = parseRich(text);
  return (
    <span className={`sh-rich ${className ?? ""}`}>
      {tokens.map((t, i) => {
        let node: React.ReactNode = t.text;
        if (t.u) node = <u>{node}</u>;
        if (t.i) node = <em>{node}</em>;
        if (t.b) node = <strong>{node}</strong>;
        return <span key={i}>{node}</span>;
      })}
    </span>
  );
}
