import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old address, kept working: everything now lives under /admin (shell spec, Section 3.1). */
export const Route = createFileRoute("/_admin/dashboard")({
  validateSearch: (s: Record<string, unknown>) => s,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/admin/leads", search: search as never });
  },
  component: () => null,
});
