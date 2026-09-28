# Hearthstead

A 24/7 AI agent farm with a visual world. Full spec: the Hearthstead SPEC (Sections 0–23).

**Built so far: Phase 1, the engine (no visuals).** Goals become plans, plans become tasks that run in dependency order, output lands in the Inbox, and a worker restart never loses or duplicates work. Everything runs on the Mock Provider (demo mode, $0).

## Run it

You need Node 22+, Postgres 16, and Redis 7. The easiest way to get the last two:

```bash
docker compose up -d          # postgres + redis for local dev
cp .env.example .env
npm install                   # also generates the Prisma client
npm run db:deploy             # create the tables
npm run seed                  # Demo Project + Strategist, Copywriter, Editor
npm run dev                   # API :4000, worker, web UI :5173
```

Open http://localhost:5173, type a goal, press **Give it to the team**.

Already have Postgres and Redis running? Point `DATABASE_URL` and `REDIS_URL` in `.env` at them and skip `docker compose`.

| Command | What it does |
|---|---|
| `npm run dev` | API, worker, and web UI together; Ctrl-C stops all three |
| `npm run worker` | Just the worker (the 24/7 engine) |
| `npm test` | All tests, against the `hearthstead_test` database and Redis db 1. Never calls a real model |
| `npm run typecheck` | TypeScript check |

Tests need a database called `hearthstead_test` owned by the same user (`createdb -O hearth hearthstead_test`), or set `TEST_DATABASE_URL`.

## How it works

```
web UI ──REST──► API (Fastify) ──enqueue──► Redis (BullMQ) ──► worker ──► ModelProvider (Mock today)
                     │                                           │
                     └────────────── Postgres + ./data ◄─────────┘
```

- **A goal** creates a `plan` task for the Strategist. Its JSON plan becomes `work` tasks with `dependsOn` edges. Every work task also depends on the plan task, so on a locked project (or with plan auto-approve off) nothing starts until you approve the plan.
- **Tasks** run when all their dependencies are `done` or `approved`. The task that produces what you see has `requiresApproval` and stops at `needs_review` in your Inbox. Approve it, or send it back with notes (a new attempt, with a fresh deliverable).
- **Deliverables** are files under `./data/projects/<projectId>/deliverables/`, with a row in Postgres.
- **Events** (`agent.walk_to`, `task.start`, `task.step`, `task.handoff`, `task.needs_review`, …) are stored in `AgentEvent`. Today they feed the Activity list; in Phase 3 they drive the animations.

### Why restarts never duplicate work

| Risk | What stops it |
|---|---|
| The same task queued twice | The BullMQ job id is `taskId__attempt`, so the second add is a no-op |
| A worker killed mid-task | The job lock expires (`JOB_LOCK_MS`, default 15s) and another worker takes the job. A sweep on startup and every minute re-enqueues anything that should be running |
| Paying for a model call twice | Each model response is saved as a `TaskStep` (with its `UsageEntry`) before anything else happens. A resumed task replays saved steps instead of calling the model again |
| Two deliverables, tasks, or bills | Unique keys on `(taskId, attempt)`, `(goalId, planKey)`, and `(taskId, attempt, step)`, written with `INSERT … ON CONFLICT DO NOTHING` |
| Counting a finished task twice | Status changes are conditional updates (`in_progress → done` happens once) |

`test/restart.test.ts` proves it: it kills a real worker process with SIGKILL mid-task, starts a new one, and checks for one deliverable and one bill per task.

### Budget guard

Checked before every model call: the pause switch, the global daily and monthly caps (Settings, default $3/$50), the project's monthly cap, the agent's daily token budget, and the task's token limit. A task that hits a limit is **blocked** with the reason, not retried. The Mock Provider costs $0, so in demo mode only the token budgets can bite.

## Layout

```
agents/templates/*.json   role templates (data, not code)
agents/hard-rules.md      appended to every system prompt at run time; not editable per agent
prisma/schema.prisma      the data model
src/api.ts                REST API
src/worker.ts             BullMQ worker + reconcile sweep
src/orchestrator.ts       goals → plans → tasks, approve/reject, dispatch
src/runner.ts             the per-task agent loop (context, model, tools, saved steps)
src/budget.ts             spending caps and prices
src/providers/            ModelProvider interface + MockProvider
src/tools.ts              tool registry (empty until Phase 2)
src/storage.ts            Storage interface, local ./data implementation
web/                      Phase 1 list UI (React + Vite + Tailwind)
```

## Phase 1 checklist

- [x] Postgres schema (Prisma), BullMQ + Redis, worker process
- [x] Agent runner with the Mock Provider; tool loop with a max-steps limit and repeated-call detection
- [x] Strategist, Copywriter, Editor from JSON templates
- [x] Tasks with dependencies; plan approval gate; approve / send back with notes / retry
- [x] Deliverables on disk
- [x] Budget guard (global, project, agent, task) and the pause switch
- [x] Simple list UI: new goal, Inbox, goals and tasks, agents, activity, spend, pause
- [x] Demo-mode goal → plan → tasks → Inbox (`test/engine.test.ts`)
- [x] Worker restart mid-task resumes without duplicates (`test/restart.test.ts`)

Next is Phase 2: the Anthropic provider, the tool registry, the full Leadership and Marketing roster, Projects with Brand Kits and Approval Lock in the UI, the seed projects, the cost dashboard, and recurring schedules.
