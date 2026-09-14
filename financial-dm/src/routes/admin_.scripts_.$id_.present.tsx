import { createFileRoute, redirect } from "@tanstack/react-router";
import Presenter from "~/components/dmScreen/Presenter";
import { getAuthStatus } from "~/server/auth";
import { getScript } from "~/server/dmScreen";

/**
 * The presenter view (presentation script spec, Section 5) at
 * /admin/scripts/<id>/present. Deliberately outside the admin shell: no
 * navigation bar, no notifications, nothing but the script (Rule 5.1). It
 * carries the same login gate as every admin page; the script is loaded
 * once here and the view makes no network calls after that (Rule 2.1).
 */
export const Route = createFileRoute("/admin_/scripts_/$id_/present")({
  beforeLoad: async ({ location }) => {
    const status = await getAuthStatus();
    if (!status.authenticated) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  loader: ({ params }) => getScript({ data: { id: Number(params.id) } }),
  head: () => ({
    meta: [
      { title: "Presenting · The DM Screen" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;600;700&display=swap" },
    ],
  }),
  component: PresentPage,
});

function PresentPage() {
  const script = Route.useLoaderData();
  if (!script) {
    return (
      <div className="min-h-dvh grid place-items-center bg-[#0b0f16] text-[#f4f1ea] p-6 text-center" data-presenter data-phase="missing">
        <p>That script is gone. <a href="/admin/scripts" className="underline text-[#d9a441]">Back to the DM Screen</a></p>
      </div>
    );
  }
  return <Presenter script={script} />;
}
