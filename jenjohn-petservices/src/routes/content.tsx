import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { verifyPassword, generateContent, checkSession, logout } from "~/lib/apiClient";
// ── Content topics (owner picker) ─────────────────────────────────────────

const TOPICS = [
  "Welcome & About the Service",
  "Tip of the Week",
  "Senior Pet Care",
  "Anxiety, Medication & Surgery Recovery Care",
  "Pet Type Spotlight",
  "Seasonal or Holiday",
  "Behind the Scenes",
  "Booking Reminder",
  "Service Area",
  "Surprise Me",
] as const;

const DEFAULT_TOPIC = "Welcome & About the Service";

// ── Tones (each its own single-select category, NO blending) ──────────────

const TONES = [
  "Warm & Cozy",
  "Playful",
  "Professional & Trustworthy",
  "Short & Punchy",
] as const;

const DEFAULT_TONE = "Warm & Cozy";

// ── Route ─────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/content")({
  component: ContentGenerator,
});

// ── UI helpers ────────────────────────────────────────────────────────────

interface SavedPost {
  id: string;
  text: string;
  topic: string;
  tone: string;
  createdAt: number;
}

const STORAGE_KEY = "jjp_saved_posts";

function loadSavedPosts(): SavedPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePosts(posts: SavedPost[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch {
    /* storage full or unavailable, ignore */
  }
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Main component ────────────────────────────────────────────────────────

function ContentGenerator() {
  const [authenticated, setAuthenticated] = useState(false);
  // Ask the server whether this browser holds a valid admin session.
  useEffect(() => {
    checkSession()
      .then((r) => {
        if (r.authenticated) setAuthenticated(true);
      })
      .catch(() => {
        /* not signed in */
      });
  }, []);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [topic, setTopic] = useState<string>(DEFAULT_TOPIC);
  const [tone, setTone] = useState<string>(DEFAULT_TONE);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [saved, setSaved] = useState<SavedPost[]>([]);

  useEffect(() => {
    setSaved(loadSavedPosts());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await verifyPassword({ data: { password } });
      if (res.success) {
        setAuthenticated(true);
      } else {
        setAuthError(res.error || "Invalid password");
      }
    } catch {
      setAuthError("Authentication failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    logout().catch(() => {
      /* cookie may already be gone */
    });
    setAuthenticated(false);
    setPassword("");
    setResult("");
    setError("");
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    setCopied(false);
    try {
      const res = await generateContent({ data: { topic, tone } });
      if (res.success && res.text) {
        setResult(res.text);
      } else {
        setError(res.error || "Could not generate the post.");
      }
    } catch {
      setError("Could not generate the post.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    if (!result.trim()) return;
    const post: SavedPost = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      text: result,
      topic,
      tone,
      createdAt: Date.now(),
    };
    const next = [post, ...saved];
    setSaved(next);
    savePosts(next);
  };

  const handleDelete = (id: string) => {
    const next = saved.filter((p) => p.id !== id);
    setSaved(next);
    savePosts(next);
  };

  const handleLoad = (post: SavedPost) => {
    setResult(post.text);
    setTopic(post.topic);
    setTone(post.tone);
    setError("");
  };

  const handleDownload = (text: string) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jen-john-post-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  // ── Login gate (reuses /admin auth pattern) ───────────────────────────
  if (!authenticated) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-brand-cream px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-sans text-2xl font-semibold tracking-wide uppercase text-brand-brown">
              Content Studio
            </h1>
            <p className="font-script text-xl text-brand-tan mt-2">
              Jen &amp; John&rsquo;s Pet Services
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-6 space-y-4"
          >
            <div>
              <label
                htmlFor="content-password"
                className="block font-sans text-sm font-semibold tracking-wide uppercase text-brand-brown mb-1"
              >
                Password
              </label>
              <input
                id="content-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-brand-tan/30 rounded-lg px-4 py-2 font-sans text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30"
                placeholder="Enter admin password"
                autoFocus
              />
            </div>

            {authError && (
              <p className="font-sans text-sm text-red-600 text-center">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-brand-brown text-brand-cream font-sans font-medium tracking-wider uppercase text-sm px-6 py-3 rounded-lg hover:bg-brand-brown-light transition-colors disabled:opacity-50"
            >
              {authLoading ? "Verifying..." : "Sign In"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ── Content Studio ─────────────────────────────────────────────────────
  return (
    <main className="min-h-dvh bg-brand-cream px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-sans text-2xl font-semibold tracking-wide uppercase text-brand-brown">
              Content Studio
            </h1>
            <p className="font-script text-lg text-brand-tan">
              Jen &amp; John&rsquo;s Pet Services
            </p>
            <p className="font-sans text-sm text-brand-brown-light mt-1">
              Private tool. Generate social posts with AI, then save, copy, or
              download them.
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="font-sans text-sm text-brand-tan hover:text-brand-brown transition-colors underline"
          >
            Sign Out
          </button>
        </header>

        {/* Topic + tone pickers */}
        <section className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-6 mb-6">
          <div className="mb-5">
            <h2 className="font-sans text-sm font-semibold tracking-wide uppercase text-brand-brown mb-3">
              What should the post be about?
            </h2>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className={`font-sans text-sm px-3 py-2 rounded-lg border transition-colors ${
                    topic === t
                      ? "bg-brand-brown text-brand-cream border-brand-brown"
                      : "bg-white text-brand-brown border-brand-tan/30 hover:bg-brand-tan/10"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-sans text-sm font-semibold tracking-wide uppercase text-brand-brown mb-1">
              Choose one tone
            </h2>
            <p className="font-sans text-xs text-brand-brown-light mb-3">
              Pick a single tone. The post will use only that tone, never a blend.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`font-sans text-sm px-3 py-3 rounded-lg border text-left transition-colors ${
                    tone === t
                      ? "bg-brand-brown text-brand-cream border-brand-brown"
                      : "bg-white text-brand-brown border-brand-tan/30 hover:bg-brand-tan/10"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="mt-6 w-full sm:w-auto bg-brand-brown text-brand-cream font-sans font-medium tracking-wider uppercase text-sm px-6 py-3 rounded-lg hover:bg-brand-brown-light transition-colors disabled:opacity-50"
          >
            {generating ? "Writing..." : "Write Post"}
          </button>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-sans text-sm text-red-700 whitespace-pre-wrap">
                {error}
              </p>
            </div>
          )}
        </section>

        {/* Result */}
        <section className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-sans text-sm font-semibold tracking-wide uppercase text-brand-brown">
              Generated post
            </h2>
            <span className="font-sans text-xs text-brand-brown-light">
              {topic} · {tone}
            </span>
          </div>

          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            readOnly={false}
            rows={12}
            placeholder="Your post will appear here. You can edit it before saving."
            className="w-full border border-brand-tan/30 rounded-lg px-4 py-3 font-sans text-sm leading-relaxed text-brand-brown focus:outline-none focus:ring-2 focus:ring-brand-brown/30 resize-y bg-brand-cream/40"
          />

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => handleCopy(result)}
              disabled={!result.trim()}
              className="bg-brand-brown text-brand-cream font-sans font-medium text-xs px-4 py-2 rounded-lg hover:bg-brand-brown-light transition-colors disabled:opacity-50"
            >
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
            <button
              type="button"
              onClick={() => handleDownload(result)}
              disabled={!result.trim()}
              className="border border-brand-tan/30 text-brand-brown font-sans font-medium text-xs px-4 py-2 rounded-lg hover:bg-brand-tan/10 transition-colors disabled:opacity-50"
            >
              Download as Text
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!result.trim()}
              className="border border-brand-brown/40 text-brand-brown font-sans font-medium text-xs px-4 py-2 rounded-lg hover:bg-brand-tan/10 transition-colors disabled:opacity-50"
            >
              Save Post
            </button>
          </div>
        </section>

        {/* Saved posts */}
        <section className="bg-white rounded-xl shadow-sm border border-brand-tan/20 p-6">
          <h2 className="font-sans text-sm font-semibold tracking-wide uppercase text-brand-brown mb-1">
            Saved posts
          </h2>
          <p className="font-sans text-xs text-brand-brown-light mb-4">
            Kept privately in this browser. Click a saved post to reopen it.
          </p>

          {saved.length === 0 ? (
            <p className="font-sans text-sm text-brand-brown-light italic">
              Nothing saved yet.
            </p>
          ) : (
            <div className="space-y-3">
              {saved.map((post) => (
                <div
                  key={post.id}
                  className="border border-brand-tan/20 rounded-lg p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="font-sans text-xs text-brand-brown-light">
                      <span className="font-semibold text-brand-brown">
                        {post.topic}
                      </span>
                      {" · "}
                      {post.tone}
                      {" · "}
                      {new Date(post.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleLoad(post)}
                        className="font-sans text-xs font-medium text-brand-brown bg-brand-tan/10 hover:bg-brand-tan/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(post.text)}
                        className="font-sans text-xs font-medium text-brand-brown bg-brand-tan/10 hover:bg-brand-tan/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(post.text)}
                        className="font-sans text-xs font-medium text-brand-brown bg-brand-tan/10 hover:bg-brand-tan/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(post.id)}
                        className="font-sans text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="font-sans text-sm text-brand-brown-light italic line-clamp-3 whitespace-pre-line">
                    {post.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="font-sans text-xs text-brand-brown-light text-center mt-8">
          {todayLabel()} · Jen &amp; John&rsquo;s Pet Services
        </p>
      </div>
    </main>
  );
}
