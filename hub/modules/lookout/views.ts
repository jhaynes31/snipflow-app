import type { Status } from "@/convex/lookout/pure";

/** The groups jobs are shown in, here and on the Overview. Each job is in exactly one of the stage groups. */
export const VIEWS: { key: string; label: string; test: (j: { status: Status; verdict: string }) => boolean }[] = [
  { key: "best", label: "Best matches", test: (j) => j.verdict === "eligible" && ["new", "review", "saved"].includes(j.status) },
  { key: "check", label: "Needs checking", test: (j) => j.verdict === "check" && ["new", "review", "saved"].includes(j.status) },
  { key: "new", label: "Newly found", test: (j) => j.status === "new" && j.verdict !== "rejected" },
  { key: "review", label: "Waiting for review", test: (j) => j.status === "review" && j.verdict !== "rejected" },
  { key: "saved", label: "Saved", test: (j) => j.status === "saved" && j.verdict !== "rejected" },
  { key: "preparing", label: "Being prepared", test: (j) => j.status === "preparing" },
  { key: "ready", label: "Ready for approval", test: (j) => j.status === "ready" },
  { key: "approved", label: "Approved, to submit", test: (j) => j.status === "approved" },
  { key: "submitted", label: "Submitted", test: (j) => j.status === "submitted" },
  { key: "interview", label: "Interviewing", test: (j) => j.status === "interview" || j.status === "offer" },
  { key: "closed", label: "Closed or not selected", test: (j) => j.status === "rejected" || j.status === "closed" },
  { key: "aside", label: "Set aside", test: (j) => (j.verdict === "rejected" && ["new", "review", "saved"].includes(j.status)) || j.status === "passed" },
];
