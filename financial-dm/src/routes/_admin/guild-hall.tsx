import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old address, kept working: everything now lives under /admin (shell spec, Section 3.1). */
export const Route = createFileRoute("/_admin/guild-hall")({
  validateSearch: (s: Record<string, unknown>) => s,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/admin/guild", search: search as never });
  },
  component: () => null,
});
