import { useCallback, useEffect, useState, type ReactNode } from "react";

// Phase 1: a plain list UI over the engine. The live world arrives in Phase 3.

type Agent = { id: string; name: string; role: string; status: string; tasksDone: number; currentTaskId: string | null };
type Project = { id: string; name: string; approvalLock: boolean };
type Task = {
  id: string;
  title: string;
  planKey: string;
  kind: "plan" | "work";
  status: string;
  attempts: number;
  lastError: string | null;
  assignedAgent: { name: string; role: string } | null;
};
type Goal = { id: string; title: string; status: string; createdAt: string; project: { name: string }; tasks: Task[] };
type InboxItem = Task & {
  goal: { title: string };
  project: { name: string; approvalLock: boolean };
  deliverable: { id: string; format: string; content: string; attempt: number } | null;
};
type Event = { id: string; type: string; createdAt: string; agent: { name: string } | null; payload: Record<string, unknown> };
type Settings = { paused: boolean; dailyCapUsd: number; monthlyCapUsd: number; autoApprovePlans: boolean };
type Spend = { day: { usd: number; tokens: number }; month: { usd: number; tokens: number } };

async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.json !== undefined ? { "content-type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data as T;
}

const STATUS_COLOR: Record<string, string> = {
  queued: "bg-stone-200 text-stone-700",
  in_progress: "bg-sky-100 text-sky-800",
  working: "bg-sky-100 text-sky-800",
  needs_review: "bg-amber-100 text-amber-800",
  waiting_review: "bg-amber-100 text-amber-800",
  planning: "bg-violet-100 text-violet-800",
  running: "bg-sky-100 text-sky-800",
  approved: "bg-emerald-100 text-emerald-800",
  done: "bg-emerald-100 text-emerald-800",
  blocked: "bg-rose-100 text-rose-800",
  failed: "bg-rose-100 text-rose-800",
  idle: "bg-stone-100 text-stone-600",
  sleeping: "bg-indigo-100 text-indigo-700",
};

function Badge({ s }: { s: string }) {
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_COLOR[s] ?? "bg-stone-100"}`}>{s.replace("_", " ")}</span>;
}

function Card({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [spend, setSpend] = useState<Spend | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [a, p, g, i, e, s, sp] = await Promise.all([
        api<Agent[]>("/agents"),
        api<Project[]>("/projects"),
        api<Goal[]>("/goals"),
        api<InboxItem[]>("/inbox"),
        api<Event[]>("/events"),
        api<Settings>("/settings"),
        api<Spend>("/spend"),
      ]);
      setAgents(a);
      setProjects(p);
      setGoals(g);
      setInbox(i);
      setEvents(e.reverse());
      setSettings(s);
      setSpend(sp);
      setError(null);
    } catch (e) {
      setError(`Can't reach the API: ${(e as Error).message}`);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const running = goals.flatMap((g) => g.tasks).filter((t) => t.status === "in_progress").length;

  return (
    <div className="mx-auto max-w-6xl p-4">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">🏡 Hearthstead</h1>
        <div className="flex flex-wrap gap-3 text-sm text-stone-600">
          <span>Spent today: ${spend?.day.usd.toFixed(2) ?? "–"} of ${settings?.dailyCapUsd ?? "–"}</span>
          <span>Tokens today: {spend?.day.tokens.toLocaleString() ?? "–"}</span>
          <span>Running: {running}</span>
          <span>🔔 Review: {inbox.length}</span>
        </div>
        <button
          className={`ml-auto rounded px-3 py-1.5 text-sm font-semibold text-white ${settings?.paused ? "bg-emerald-600" : "bg-rose-600"}`}
          onClick={() => act(() => api("/settings", { method: "PATCH", json: { paused: !settings?.paused } }))}
        >
          {settings?.paused ? "▶ Resume the farm" : "⏸ Pause the farm"}
        </button>
      </header>

      {error && <p className="mb-4 rounded bg-rose-50 p-2 text-sm text-rose-800">{error}</p>}
      {settings?.paused && <p className="mb-4 rounded bg-indigo-50 p-2 text-sm text-indigo-800">The farm is paused. Nothing new starts until you resume.</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <NewGoal projects={projects} onCreate={(body) => act(() => api("/goals", { method: "POST", json: body }))} />

          <Card title={`Inbox (${inbox.length})`}>
            {inbox.length === 0 && <p className="text-sm text-stone-500">Nothing waiting for you.</p>}
            <div className="space-y-4">
              {inbox.map((item) => (
                <InboxRow
                  key={`${item.id}-${item.attempts}`}
                  item={item}
                  onApprove={() => act(() => api(`/tasks/${item.id}/approve`, { method: "POST" }))}
                  onReject={(notes) => act(() => api(`/tasks/${item.id}/reject`, { method: "POST", json: { notes } }))}
                />
              ))}
            </div>
          </Card>

          <Card title="Goals">
            {goals.length === 0 && <p className="text-sm text-stone-500">No goals yet. Create one above.</p>}
            <ul className="space-y-3">
              {goals.map((g) => (
                <li key={g.id} className="rounded border border-stone-100 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{g.title}</span>
                    <Badge s={g.status} />
                    <span className="text-xs text-stone-500">{g.project.name}</span>
                  </div>
                  <ol className="mt-2 space-y-1 text-sm">
                    {g.tasks.map((t) => (
                      <li key={t.id} className="flex flex-wrap items-center gap-2">
                        <Badge s={t.status} />
                        <span>{t.title}</span>
                        <span className="text-xs text-stone-500">{t.assignedAgent?.name} ({t.assignedAgent?.role})</span>
                        {t.attempts > 0 && <span className="text-xs text-stone-500">attempt {t.attempts + 1}</span>}
                        {t.lastError && <span className="w-full text-xs text-rose-700">⛈ {t.lastError}</span>}
                        {(t.status === "failed" || t.status === "blocked") && (
                          <button className="text-xs text-sky-700 underline" onClick={() => act(() => api(`/tasks/${t.id}/retry`, { method: "POST" }))}>
                            retry
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Agents">
            <ul className="space-y-2 text-sm">
              {agents.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-stone-500">{a.role}</span>
                  <span className="ml-auto">
                    <Badge s={a.status} />
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Activity">
            <ul className="max-h-[32rem] space-y-1 overflow-y-auto text-xs">
              {events.map((e) => (
                <li key={e.id} className="flex gap-2">
                  <span className="shrink-0 text-stone-400">{new Date(e.createdAt).toLocaleTimeString()}</span>
                  <span>
                    <b>{e.agent?.name ?? "farm"}</b> {e.type}
                    {typeof e.payload.icon === "string" && ` ${e.payload.icon}`}
                    {typeof e.payload.title === "string" && `: ${e.payload.title}`}
                    {typeof e.payload.message === "string" && `: ${e.payload.message}`}
                    {typeof e.payload.reason === "string" && `: ${e.payload.reason}`}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function NewGoal({ projects, onCreate }: { projects: Project[]; onCreate: (b: { projectId: string; title: string; brief: string }) => void }) {
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const pid = projectId || projects[0]?.id || "";
  return (
    <Card title="New goal">
      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !pid) return;
          onCreate({ projectId: pid, title, brief });
          setTitle("");
          setBrief("");
        }}
      >
        <select className="rounded border border-stone-300 p-2 text-sm" value={pid} onChange={(e) => setProjectId(e.target.value)}>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.approvalLock ? "🔒 " : ""}
              {p.name}
            </option>
          ))}
        </select>
        <input className="rounded border border-stone-300 p-2 text-sm" placeholder="What should the team do? e.g. Write a spring promo post" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="rounded border border-stone-300 p-2 text-sm" rows={2} placeholder="Details (optional)" value={brief} onChange={(e) => setBrief(e.target.value)} />
        <button className="justify-self-start rounded bg-stone-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40" disabled={!title.trim() || !pid}>
          Give it to the team
        </button>
      </form>
    </Card>
  );
}

function InboxRow({ item, onApprove, onReject }: { item: InboxItem; onApprove: () => void; onReject: (notes: string) => void }) {
  const [notes, setNotes] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const content = item.deliverable?.format === "json" ? prettyPlan(item.deliverable.content) : item.deliverable?.content;
  return (
    <div className="rounded border border-amber-200 bg-amber-50/40 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">{item.kind === "plan" ? "📋 Plan to approve" : "📝 Deliverable"}: {item.goal.title}</span>
        <span className="text-xs text-stone-500">
          {item.project.approvalLock && "🔒 "}
          {item.project.name} · by {item.assignedAgent?.name}
          {item.attempts > 0 && ` · attempt ${item.attempts + 1}`}
        </span>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded bg-white p-3 font-sans text-sm">{content ?? "(no output)"}</pre>
      <div className="mt-2 flex flex-wrap items-start gap-2">
        <button className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white" onClick={onApprove}>
          Approve
        </button>
        {rejecting ? (
          <form
            className="flex w-full flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (notes.trim()) onReject(notes);
            }}
          >
            <input autoFocus className="min-w-0 flex-1 rounded border border-stone-300 p-1.5 text-sm" placeholder="What should change?" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button className="rounded bg-stone-700 px-3 py-1.5 text-sm text-white" disabled={!notes.trim()}>
              Send back
            </button>
          </form>
        ) : (
          <button className="rounded border border-stone-300 px-3 py-1.5 text-sm" onClick={() => setRejecting(true)}>
            Send back with notes
          </button>
        )}
        {item.deliverable && (
          <a className="ml-auto self-center text-xs text-sky-700 underline" download={`${item.title}.${item.deliverable.format}`} href={`data:text/plain;charset=utf-8,${encodeURIComponent(item.deliverable.content)}`}>
            download
          </a>
        )}
      </div>
    </div>
  );
}

function prettyPlan(json: string) {
  try {
    const plan = JSON.parse(json) as { tasks: { key: string; title: string; role: string; dependsOn: string[]; brief: string }[] };
    return plan.tasks
      .map((t, i) => `${i + 1}. ${t.title} (${t.role})${t.dependsOn.length ? ` after ${t.dependsOn.join(", ")}` : ""}\n   ${t.brief}`)
      .join("\n");
  } catch {
    return json;
  }
}
