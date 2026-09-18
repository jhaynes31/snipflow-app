import { createFileRoute } from "@tanstack/react-router";
import StudioShell from "~/components/studio/StudioShell";
import VideoLibrary from "~/components/studio/VideoLibrary";

/**
 * The Recording Studio (Recording Studio spec). One page every entry point
 * opens into: with a video it is the four-step Studio, without one it is
 * the Video Library.
 */
export const Route = createFileRoute("/_admin/admin/studio")({
  validateSearch: (s: Record<string, unknown>): { video?: number } => ({ video: Number(s.video) > 0 ? Number(s.video) : undefined }),
  component: StudioPage,
});

function StudioPage() {
  const { video } = Route.useSearch();
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {!video && (
        <header className="text-center space-y-1">
          <h1 className="font-fantasy text-2xl text-[#c08020]">🎬 The Recording Studio</h1>
          <p className="text-[#a0a0a0] text-sm font-fantasy">Script → Record → Edit → Save, without leaving the tavern.</p>
        </header>
      )}
      {video ? <StudioShell key={video} id={video} /> : <VideoLibrary />}
    </div>
  );
}
