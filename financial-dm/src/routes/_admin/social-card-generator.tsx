import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy route. The card generator now lives in the unified hub at
 * /generator; keep this path so old bookmarks and links still land there.
 */
export const Route = createFileRoute("/_admin/social-card-generator")({
  beforeLoad: () => {
    throw redirect({ to: "/generator", search: { tab: "card", view: "forge" } });
  },
});
