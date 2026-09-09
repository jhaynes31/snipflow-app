/** Sanitize a title into a safe filename slug. */
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "script";
}

// ── Hook mechanism helpers ────────────────────────────────────────
// Canonical values are stored in the DB. Labels are for display only.

export const HOOK_TYPE_VALUES = [
  "curiosity_gap",
  "direct_callout",
  "contrarian",
  "number_specific",
  "mix",
] as const;

export const HOOK_TYPE_LABELS: Record<string, string> = {
  curiosity_gap: "Curiosity Gap",
  direct_callout: "Direct Callout",
  contrarian: "Contrarian",
  number_specific: "Number Specific",
  mix: "Mix",
};

/** Normalize a raw hook type string to a canonical value (or empty). */
export function normalizeHookType(raw: unknown): string {
  const v = String(raw ?? "").trim().toLowerCase();
  return (HOOK_TYPE_VALUES as readonly string[]).includes(v) ? v : "";
}

/** Compose the full script from a hook and the hookless body. */
export function composeScript(hook: string, scriptBody: string): string {
  const h = (hook || "").trim();
  const b = (scriptBody || "").trim();
  if (!h) return b;
  if (!b) return h;
  return `${h}\n\n${b}`;
}

export interface ScriptTextParts {
  title: string;
  topic: string;
  tone: string;
  dndThemed: boolean;
  hookType?: string;
  targetViewer?: string;
  painPoint?: string;
  hook: string;
  script: string;
  callToAction: string;
  caption: string;
  hashtags: string[];
}

/** Add a labeled section to the export only when it has content. */
function pushIf(parts: string[], label: string, content: string): void {
  if (!content) return;
  if (parts.length > 0 && parts[parts.length - 1] !== "") parts.push("");
  parts.push(label, content);
}

/**
 * Build the plain text export of a full posting package (title, meta
 * line, hook, script, call to action, caption, and hashtags). Uses clean
 * lines and plain words, no em dashes or hyphens in visible labels.
 */
export function buildScriptText({
  title,
  topic,
  tone,
  dndThemed,
  hookType,
  targetViewer,
  painPoint,
  hook,
  script,
  callToAction,
  caption,
  hashtags,
}: ScriptTextParts): string {
  const metaLines = [`Topic: ${topic}`, `Tone: ${tone}`];
  if (painPoint) metaLines.push(`Pain point: ${painPoint}`);
  if (dndThemed) metaLines.push("D&D theme: Yes");
  if (hookType) metaLines.push(`Hook type: ${HOOK_TYPE_LABELS[hookType] ?? hookType}`);
  if (targetViewer) metaLines.push(`Target viewer: ${targetViewer}`);
  const parts: string[] = [title, "", metaLines.join("  |  ")];
  pushIf(parts, "Hook", hook);
  pushIf(parts, "Script", script);
  pushIf(parts, "Call to Action", callToAction);
  pushIf(parts, "Caption", caption);
  if (hashtags && hashtags.length > 0) {
    pushIf(parts, "Hashtags", hashtags.join(" "));
  }
  return parts.join("\n");
}

/** Trigger a client side download of text as a .txt file. */
export function downloadScript(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
