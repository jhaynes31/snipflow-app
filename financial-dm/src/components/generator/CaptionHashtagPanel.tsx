import { useCallback, useState } from "react";

/**
 * Shared caption options + hashtags block. Every generator renders the same
 * output shape: 2 to 3 caption options (one selected) and a hashtag set.
 */
export default function CaptionHashtagPanel({
  captions,
  caption,
  onSelectCaption,
  hashtags,
  compact = false,
  onError,
  onRegenerateCaptions,
  onRegenerateHashtags,
  regenerating = "",
  regenerateDisabled = false,
}: {
  captions: string[];
  caption: string;
  onSelectCaption?: (caption: string) => void;
  hashtags: string[];
  compact?: boolean;
  onError?: (message: string) => void;
  /** Optional per section re rolls (the script forge passes these). */
  onRegenerateCaptions?: () => void;
  onRegenerateHashtags?: () => void;
  regenerating?: "" | "captions" | "hashtags";
  regenerateDisabled?: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback(
    async (key: string, text: string) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
      } catch {
        onError?.("Could not copy to clipboard.");
      }
    },
    [onError],
  );

  const options = captions.length > 0 ? captions : caption ? [caption] : [];
  const textSize = compact ? "text-xs" : "text-sm";

  return (
    <div className="space-y-3">
      {/* Captions */}
      <div className={`rounded-lg border border-[#406080]/30 bg-[#111a28] ${compact ? "p-3" : "p-4"}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[#c08020] font-bold font-fantasy text-sm">
            ✍️ Caption{options.length > 1 ? " options" : ""}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => copy("caption", caption)}
              disabled={!caption}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy disabled:opacity-40"
            >
              {copied === "caption" ? "✅ Copied!" : "📋 Copy Caption"}
            </button>
            {onRegenerateCaptions && (
              <button
                type="button"
                onClick={onRegenerateCaptions}
                disabled={regenerateDisabled || (regenerating !== "" && regenerating !== "captions")}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-[#c08020]/20 border border-[#c08020]/50 text-[#c08020] hover:bg-[#c08020]/30 transition-all text-xs font-fantasy disabled:opacity-50"
                aria-label="New captions only"
                data-regen="captions"
              >
                {regenerating === "captions" ? "Re rolling..." : "🎲 New Captions"}
              </button>
            )}
          </div>
        </div>
        {options.length === 0 ? (
          <p className="text-[#606080] text-sm font-fantasy">No caption was generated.</p>
        ) : (
          <div className="space-y-2">
            {options.map((opt, i) => {
              const selected = opt === caption;
              return (
                <button
                  key={`${i}-${opt.slice(0, 24)}`}
                  type="button"
                  onClick={() => onSelectCaption?.(opt)}
                  aria-pressed={selected}
                  data-caption-option
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selected
                      ? "border-[#c08020] bg-[#c08020]/10"
                      : "border-[#406080]/30 bg-[#0d1520]/40 hover:border-[#c08020]/50"
                  }`}
                >
                  <span className="flex items-start gap-2">
                    <span className="text-xs mt-0.5" aria-hidden="true">
                      {selected ? "✅" : "○"}
                    </span>
                    <span className={`text-[#e0e0e0] leading-relaxed ${textSize} font-fantasy whitespace-pre-wrap`}>
                      {opt}
                    </span>
                  </span>
                </button>
              );
            })}
            {options.length > 1 && (
              <p className="text-[#606080] text-xs font-fantasy">
                The checked caption is the one that gets saved, copied, and
                downloaded.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Hashtags */}
      <div className={`rounded-lg border border-[#406080]/30 bg-[#111a28] ${compact ? "p-3" : "p-4"}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[#c08020] font-bold font-fantasy text-sm">🏷️ Hashtags</p>
          <div className="flex gap-2">
            {hashtags.length > 0 && (
              <button
                type="button"
                onClick={() => copy("hashtags", hashtags.join(" "))}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-[#204060]/30 border border-[#406080]/30 text-[#e0e0e0] hover:bg-[#204060]/50 transition-all text-xs font-fantasy"
              >
                {copied === "hashtags" ? "✅ Copied!" : "📋 Copy Hashtags"}
              </button>
            )}
            {onRegenerateHashtags && (
              <button
                type="button"
                onClick={onRegenerateHashtags}
                disabled={regenerateDisabled || (regenerating !== "" && regenerating !== "hashtags")}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-[#c08020]/20 border border-[#c08020]/50 text-[#c08020] hover:bg-[#c08020]/30 transition-all text-xs font-fantasy disabled:opacity-50"
                aria-label="New hashtags only"
                data-regen="hashtags"
              >
                {regenerating === "hashtags" ? "Re rolling..." : "🎲 New Hashtags"}
              </button>
            )}
          </div>
        </div>
        {hashtags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="inline-block px-2 py-1 rounded-md bg-[#c08020]/10 border border-[#c08020]/30 text-[#c08020] text-sm font-fantasy"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[#606080] text-sm font-fantasy">No hashtags were generated.</p>
        )}
      </div>
    </div>
  );
}
