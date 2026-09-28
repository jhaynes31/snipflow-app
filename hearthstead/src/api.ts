import Fastify from "fastify";
import { spendSummary } from "./budget";
import { config } from "./config";
import { db, getSettings } from "./db";
import { emit } from "./events";
import { approveTask, createGoal, reconcile, rejectTask, retryTask } from "./orchestrator";
import { storage } from "./storage";

export function buildApi() {
  const app = Fastify({ logger: { level: "warn" } });

  // Owner actions throw plain Errors with a message meant for people.
  app.setErrorHandler((err: Error & { statusCode?: number }, _req, reply) => {
    reply.status(err.statusCode ?? 400).send({ error: err.message });
  });

  app.get("/api/health", async () => {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, provider: config.modelProvider };
  });

  app.get("/api/projects", async () => db.project.findMany({ orderBy: { createdAt: "asc" } }));

  app.get("/api/agents", async () =>
    db.agent.findMany({ where: { archived: false }, orderBy: { createdAt: "asc" } }),
  );

  app.get("/api/goals", async () =>
    db.goal.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        project: { select: { name: true } },
        tasks: {
          orderBy: { createdAt: "asc" },
          include: {
            assignedAgent: { select: { name: true, role: true } },
            deliverables: { select: { id: true, attempt: true, title: true }, orderBy: { attempt: "asc" } },
          },
        },
      },
    }),
  );

  app.post<{ Body: { projectId: string; title: string; brief?: string } }>("/api/goals", async (req) => {
    const { projectId, title, brief } = req.body ?? ({} as never);
    if (!projectId || !title?.trim()) throw new Error("A goal needs a project and a title.");
    return createGoal({ projectId, title: title.trim(), brief: brief?.trim() ?? "" });
  });

  app.get("/api/inbox", async () => {
    const tasks = await db.task.findMany({
      where: { status: "needs_review" },
      orderBy: { updatedAt: "desc" },
      include: {
        goal: { select: { title: true } },
        project: { select: { name: true, approvalLock: true } },
        assignedAgent: { select: { name: true, role: true } },
        deliverables: { orderBy: { attempt: "desc" }, take: 1 },
      },
    });
    return Promise.all(
      tasks.map(async (t) => {
        const d = t.deliverables[0];
        return { ...t, deliverable: d ? { ...d, content: await storage.read(d.path) } : null };
      }),
    );
  });

  app.get<{ Params: { id: string } }>("/api/deliverables/:id", async (req) => {
    const d = await db.deliverable.findUniqueOrThrow({ where: { id: req.params.id } });
    return { ...d, content: await storage.read(d.path) };
  });

  app.post<{ Params: { id: string } }>("/api/tasks/:id/approve", async (req) => {
    await approveTask(req.params.id);
    return { ok: true };
  });

  app.post<{ Params: { id: string }; Body: { notes?: string } }>("/api/tasks/:id/reject", async (req) => {
    const notes = req.body?.notes?.trim();
    if (!notes) throw new Error("Say what should change, so the agent knows what to fix.");
    await rejectTask(req.params.id, notes);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>("/api/tasks/:id/retry", async (req) => {
    await retryTask(req.params.id);
    return { ok: true };
  });

  app.get<{ Querystring: { after?: string } }>("/api/events", async (req) => {
    const after = BigInt(req.query.after ?? "0");
    const rows = await db.agentEvent.findMany({
      where: { id: { gt: after } },
      orderBy: { id: after > 0n ? "asc" : "desc" },
      take: 100,
      include: { agent: { select: { name: true } } },
    });
    if (after === 0n) rows.reverse();
    return rows.map((r) => ({ ...r, id: r.id.toString() }));
  });

  app.get("/api/spend", async () => spendSummary());

  app.get("/api/settings", async () => getSettings());

  app.patch<{ Body: { paused?: boolean; dailyCapUsd?: number; monthlyCapUsd?: number; autoApprovePlans?: boolean } }>(
    "/api/settings",
    async (req) => {
      const b = req.body ?? {};
      const data: Record<string, unknown> = {};
      if (typeof b.paused === "boolean") data.paused = b.paused;
      if (typeof b.autoApprovePlans === "boolean") data.autoApprovePlans = b.autoApprovePlans;
      for (const k of ["dailyCapUsd", "monthlyCapUsd"] as const) {
        if (b[k] !== undefined) {
          if (typeof b[k] !== "number" || b[k] < 0) throw new Error(`${k} must be a number of dollars, 0 or more.`);
          data[k] = b[k];
        }
      }
      await getSettings();
      const s = await db.settings.update({ where: { id: "global" }, data });
      if (b.paused === true) await emit("farm.paused");
      if (b.paused === false) await reconcile(); // pick queued work back up now, not at the next sweep
      return s;
    },
  );

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = buildApi();
  await app.listen({ port: config.apiPort, host: "0.0.0.0" });
  console.log(`[api] http://localhost:${config.apiPort}`);
}
