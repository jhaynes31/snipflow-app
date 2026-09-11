import { createFileRoute, notFound } from "@tanstack/react-router";
import LootPage from "~/components/loot/LootPage";
import { lootPageById } from "~/lib/lootPages";

/**
 * Public but unlisted: /loot/<id>. Not linked from navigation and marked
 * noindex (loot pages spec, Section 3). Whether a visitor must give their
 * details first is the quiz's job, not this page's.
 */
export const Route = createFileRoute("/loot/$id")({
  loader: ({ params }) => {
    const page = lootPageById(params.id);
    if (!page) throw notFound();
    return { page };
  },
  head: ({ loaderData }) => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: loaderData ? `${loaderData.page.title} · The Financial DM` : "Loot · The Financial DM" },
      { name: "description", content: loaderData?.page.subtitle ?? "" },
    ],
  }),
  component: LootRoute,
});

function LootRoute() {
  const { page } = Route.useLoaderData();
  return <LootPage page={page} />;
}
