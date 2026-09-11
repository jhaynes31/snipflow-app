import { createFileRoute, notFound } from "@tanstack/react-router";

/**
 * Campaign links (Quest Board spec, Section 8.1): thefinancialdm.com/<slug>.
 *
 * A GET on a one-word path is looked up against quest, series, and post
 * links. A match redirects to the right quiz and sets the first-party
 * attribution cookie; anything else gets a not-found page. Real pages
 * (quiz, wealth-check, loot, admin) are static routes, so they always win
 * over this dynamic one, and the reserved-slug list keeps John from ever
 * naming a link after one of them.
 */
export const Route = createFileRoute("/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { handleCampaignLink } = await import("~/server/attribution.server");
        return handleCampaignLink(params.slug, request);
      },
    },
  },
  loader: () => {
    throw notFound();
  },
  component: CampaignLinkPage,
});

/** Never shown: a matching slug redirects and anything else is not found. */
function CampaignLinkPage() {
  return null;
}
