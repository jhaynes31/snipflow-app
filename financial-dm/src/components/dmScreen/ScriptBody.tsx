import { parseBody } from "~/lib/dmScreen";

/**
 * Renders a section body from its plain text markers: paragraphs, bullets,
 * bold, italic. Used by the editor preview and the presenter view, so what
 * John sees while editing is what he reads on stage.
 */
export default function ScriptBody({ body, className = "" }: { body: string; className?: string }) {
  const blocks = parseBody(body);
  if (!blocks.length) return null;
  const out: React.ReactNode[] = [];
  let list: React.ReactNode[] = [];
  const flushList = () => {
    if (list.length) out.push(<ul key={`ul${out.length}`} className="list-disc pl-[1.2em] space-y-[0.35em]">{list}</ul>);
    list = [];
  };
  blocks.forEach((b, i) => {
    const runs = b.runs.map((r, j) => {
      let node: React.ReactNode = r.text;
      if (r.italic) node = <em key={j}>{node}</em>;
      if (r.bold) node = <strong key={j}>{node}</strong>;
      return r.bold || r.italic ? node : <span key={j}>{node}</span>;
    });
    if (b.kind === "bullet") list.push(<li key={i}>{runs}</li>);
    else {
      flushList();
      out.push(<p key={i}>{runs}</p>);
    }
  });
  flushList();
  return <div className={`space-y-[0.7em] ${className}`} data-script-body>{out}</div>;
}
