import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Legacy route. The script generator now lives in the unified hub at
 * /generator; keep this path so old bookmarks and links still land there.
 */
export const Route = createFileRoute("/_admin/script-generator")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/forge", search: { tab: "script", view: "forge" } });
  },
});
