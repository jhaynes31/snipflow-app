import { createServerFn } from "@tanstack/react-start";

interface AvailabilityRecord {
  date: string;
  isOpen: boolean;
  note?: string;
}

export const getAvailability = createServerFn({ method: "GET" }).handler(
  async () => {
    const deploymentUrl = process.env.CONVEX_DEPLOYMENT_URL;
    if (!deploymentUrl) {
      return { success: false, dates: [] as string[], error: "Backend not configured" };
    }

    try {
      const response = await fetch(`${deploymentUrl}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "queries:getAvailability",
          args: {},
        }),
      });

      if (!response.ok) {
        return { success: false, dates: [] as string[], error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      // Convex returns { value: ... } wrapping the handler return
      const records: AvailabilityRecord[] = data.value ?? data ?? [];
      // dates = blocked date strings; everything else is available by default.
      const dates = records
        .filter((r) => !r.isOpen)
        .map((r) => r.date);
      return { success: true, dates };
    } catch (err) {
      return {
        success: false,
        dates: [] as string[],
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  },
);
