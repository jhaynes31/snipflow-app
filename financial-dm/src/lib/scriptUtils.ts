/** Sanitize a title into a safe filename slug. */
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "script";
}

export interface ScriptTextParts {
  title: string;
  topic: string;
  tone: string;
  dndThemed: boolean;
  hookType?: string;
  targetViewer?: string;
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
  hook,
  script,
  callToAction,
  caption,
  hashtags,
}: ScriptTextParts): string {
  const metaLines = [`Topic: ${topic}`, `Tone: ${tone}`];
  if (dndThemed) metaLines.push("D&D theme: Yes");
  if (hookType) metaLines.push(`Hook type: ${hookType}`);
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
