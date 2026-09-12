import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import AdminNav from "~/components/AdminNav";
import { getAuthStatus } from "~/server/auth";

/**
 * Pathless layout that guards every private page. Files under
 * src/routes/_admin/ keep their public URLs (/dashboard, /generator, ...) but
 * inherit this `beforeLoad`, which asks the server whether the request carries
 * a valid admin session and bounces anonymous visitors to /login.
 *
 * This is the page level gate. The data level gate is the `requireAdmin`
 * middleware on every private server function (see src/server/auth.ts), so
 * the tools stay closed even if someone calls the server functions directly.
 */
export const Route = createFileRoute("/_admin")({
  beforeLoad: async ({ location }) => {
    const status = await getAuthStatus();
    if (!status.authenticated) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AdminLayout,
});

/**
 * Every private page gets the same navigation bar, so one login reaches the
 * leads, the Quest Board, every forge, both quizzes, the guide, the password
 * page, and sign out.
 */
function AdminLayout() {
  return (
    <>
      <AdminNav />
      <div className="pb-20 md:pb-0">
        <Outlet />
      </div>
    </>
  );
}
