// `npm run dev`: API, worker, and web UI together. Ctrl-C stops all three.
import { spawn } from "node:child_process";

const procs = [
  ["api", "npm", ["run", "api"]],
  ["worker", "npm", ["run", "worker"]],
  ["web", "npm", ["run", "web"]],
].map(([name, cmd, args]) => {
  const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], detached: true });
  const prefix = (chunk) =>
    chunk.toString().split("\n").filter(Boolean).forEach((line) => console.log(`[${name}] ${line}`));
  p.stdout.on("data", prefix);
  p.stderr.on("data", prefix);
  p.on("exit", (code) => {
    console.log(`[${name}] exited (${code})`);
    stop(code ?? 1);
  });
  return p;
});

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  // SIGINT lets the worker finish its current step; anything unfinished resumes next start.
  for (const p of procs) if (p.exitCode === null) try { process.kill(-p.pid, "SIGINT"); } catch {}
  setTimeout(() => process.exit(code), 3000).unref();
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
