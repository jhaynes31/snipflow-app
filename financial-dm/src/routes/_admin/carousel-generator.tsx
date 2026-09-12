import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy route. The carousel generator now lives in the unified hub at
 * /generator; keep this path so old bookmarks and links still land there.
 */
export const Route = createFileRoute("/_admin/carousel-generator")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/forge", search: { tab: "carousel", view: "forge" } });
  },
});
