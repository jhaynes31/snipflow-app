import { LinkBtn } from "@/core/ui";

export default function NotFound() {
  return (
    <div className="sh-container sh-narrow sh-planned">
      <h1 className="sh-h1">There&apos;s no door here.</h1>
      <p className="sh-muted">That address doesn&apos;t match a place in the village.</p>
      <LinkBtn href="/" variant="secondary">
        Back home
      </LinkBtn>
    </div>
  );
}
