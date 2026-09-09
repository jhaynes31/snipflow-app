import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { getAuthStatus, logout } from "~/server/auth";

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

function AdminLayout() {
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.assign("/login");
    }
  };

  return (
    <>
      <div className="fixed top-3 right-3 z-40">
        <button
          type="button"
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-lg bg-[#0d1520]/80 border border-[#406080]/40 text-[#a0a0a0] hover:text-[#e0e0e0] hover:border-[#c08020]/50 text-xs font-fantasy transition-all backdrop-blur"
          title="Sign out of the private tools"
        >
          🚪 Sign out
        </button>
      </div>
      <Outlet />
    </>
  );
}
