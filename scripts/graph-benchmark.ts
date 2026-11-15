/** TASK-136 repeatable synthetic benchmark; no model calls or persistent project writes. */
import { spyOn } from "bun:test";
import { createHash } from "node:crypto";
import { cpus, platform, release, totalmem } from "node:os";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as repository from "../src/repository.ts";
import * as agents from "../src/services/agents.ts";
import * as currentEngine from "../src/engine.ts";
import * as currentDashboard from "../src/services/dashboard.ts";
import * as legacyEngine from "../tests/fixtures/graph-baseline/engine.ts";
import * as legacyDashboard from "../tests/fixtures/graph-baseline/dashboard.ts";
import { chainGraph, volumeGraph } from "../tests/fixtures/graph-inputs.ts";
import { serializeTomlFrontmatter } from "../src/frontmatter.ts";
import type { ProjectContext } from "../src/domain.ts";

const health: agents.AgentsHealthReport = { config: { contextWindowTokens: 400000, rootTarget: 900, rootHardCap: 1200, chainTarget: 1800, chainHardCap: 2200 },
  files: [], chains: [], failures: [], summary: { fileCount: 0, failureCount: 0, maxFileTokens: 0, maxChainTokens: 0, ok: true } };
const warmups = 5, samples = 20;
const operations = ["status", "timeline", "timeline-selected", "dashboard"] as const;
type Operation = typeof operations[number];
function fixture(name: string) { return name === "volume" ? volumeGraph() : chainGraph(name === "chain-1000" ? 1000 : 10000); }
function operation(context: ProjectContext, name: Operation, legacy: boolean): () => unknown {
  const engine = legacy ? legacyEngine : currentEngine;
  const dashboard = legacy ? legacyDashboard : currentDashboard;
  // Card preparation and fixture creation are outside the Timeline-only measurement.
  const index = currentEngine.buildTaskAnalysisIndex(context.tasks);
  const cards = context.tasks.map(task => currentDashboard.toTaskCard(task, index.byId, index));
  const selectedTaskId = context.tasks[Math.floor(context.tasks.length / 2)]?.id;
  if (name === "status") return () => engine.deriveStatusSnapshot(context);
  if (name === "dashboard") return () => dashboard.buildDashboardData(context.rootDir, { timelineMode: "all", selectedTimelineTaskId: selectedTaskId });
  return () => dashboard.buildTimelineProjection(cards, context.specs, { mode: "all", selectedSpecIds: [], ...(name === "timeline-selected" ? { selectedTaskId } : {}) });
}
async function measure(run: () => unknown) {
  for (let n = 0; n < warmups; n += 1) await run();
  const timings: number[] = [];
  for (let n = 0; n < samples; n += 1) { const start = performance.now(); await run(); timings.push(performance.now() - start); }
  const sorted = [...timings].sort((a, b) => a - b);
  return { warmups, samples, medianMs: (sorted[9]! + sorted[10]!) / 2, p95Ms: sorted[Math.ceil(samples * .95) - 1]!, timingsMs: timings };
}
async function withInput<T>(context: ProjectContext, run: () => Promise<T>) {
  const load = spyOn(repository, "loadProjectContext").mockResolvedValue(context);
  const report = spyOn(agents, "buildAgentsHealthReport").mockResolvedValue(health);
  try { return await run(); } finally { load.mockRestore(); report.mockRestore(); }
}

if (process.argv[2] === "--legacy-probe") {
  const context = fixture(process.argv[3]!); const name = process.argv[4] as Operation;
  try { await withInput(context, async () => { const run = operation(context, name, true); const start = performance.now(); await run(); console.log(JSON.stringify({ outcome: "completed", durationMs: performance.now() - start })); }); }
  catch (error) { console.log(JSON.stringify({ outcome: "failed", error: error instanceof Error ? `${error.name}: ${error.message}` : "unknown error" })); }
} else {
  const startedAt = new Date().toISOString();
  const rows: unknown[] = [];
  for (const fixtureName of ["chain-1000", "chain-10000", "volume"]) {
    const context = fixture(fixtureName);
    await withInput(context, async () => {
      for (const legacy of fixtureName === "chain-1000" ? [true, false] : [false]) for (const name of operations) {
        Bun.gc(true);
        rows.push({ fixture: fixtureName, implementation: legacy ? "baseline" : "optimized", operation: name, ...(await measure(operation(context, name, legacy))) });
      }
    });
    if (fixtureName !== "chain-1000") for (const name of operations) {
      // The recursive baseline can fail at scale. Probe in an isolated low-memory-mode child,
      // with a deadline; failure is evidence, never reported as an equivalent latency sample.
      const child = Bun.spawn([process.execPath, "--smol", import.meta.filename, "--legacy-probe", fixtureName, name], { stdout: "pipe", stderr: "pipe" });
      let expired = false;
      const timer = setTimeout(() => { expired = true; child.kill("SIGKILL"); }, 8000);
      const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]); clearTimeout(timer);
      rows.push({ fixture: fixtureName, implementation: "baseline", operation: name, probeOnly: true, deadlineMs: 8000, expired, exitCode: code,
        result: stdout.trim() ? JSON.parse(stdout) : { outcome: "process-failed", stderr: stderr.slice(0, 500) } });
    }
  }

  // Separate real filesystem/agents work from the loaded-context pure measurements.
  const root = await mkdtemp("/private/tmp/spm-graph-benchmark-");
  let io: unknown;
  try {
    await repository.initializeProject(root);
    const context = volumeGraph();
    for (const folder of ["tasks", "specs"]) { await rm(join(root, "docs/spm", folder), { recursive: true }); await mkdir(join(root, "docs/spm", folder)); }
    const documents = [...context.tasks.map(task => ({ dir: "tasks", id: task.id, body: serializeTomlFrontmatter({ doc_kind: "task", id: task.id, title: task.title, summary: task.summary,
      status: task.status, priority: task.priority, spec_ids: task.specIds, depends_on: task.dependsOn, blocked_by: [], tags: [] }, task.body) })),
      ...context.specs.map(spec => ({ dir: "specs", id: spec.id, body: serializeTomlFrontmatter({ doc_kind: "spec", id: spec.id, title: spec.title, summary: spec.summary,
        status: spec.status, task_ids: spec.taskIds, tags: [] }, spec.body) }))];
    for (let cursor = 0; cursor < documents.length; cursor += 100) await Promise.all(documents.slice(cursor, cursor + 100).map(doc => writeFile(join(root, "docs/spm", doc.dir, `${doc.id}.md`), doc.body)));
    io = { loading: await measure(() => repository.loadProjectContext(root)), agents: await measure(() => agents.buildAgentsHealthReport(root)),
      optimizedFacadeWithIO: await measure(() => currentDashboard.buildDashboardData(root, { timelineMode: "all", selectedTimelineTaskId: "TASK-5000" })) };
  } finally { await rm(root, { recursive: true, force: true }); }
  const sourceHashes = Object.fromEntries(await Promise.all(["src/engine.ts", "src/services/dashboard.ts", "tests/fixtures/graph-inputs.ts", "scripts/graph-benchmark.ts"].map(async path => [path, createHash("sha256").update(await readFile(new URL(`../${path}`, import.meta.url))).digest("hex")])));
  const output = { baselineCommit: "cd01b72841f7203f085708d5e08ed9224efa5cd1", startedAt, finishedAt: new Date().toISOString(), runtime: { bun: Bun.version, platform: platform(), release: release(), arch: process.arch,
    cpu: cpus()[0]?.model, logicalCPUs: cpus().length, memoryBytes: totalmem() }, protocol: "5 warmups + 20 serial samples; nearest-rank p95; GC before each pure phase, not timed samples. No HTTP/rendering/cold-cache acceptance. Pure facade stubs loadProjectContext/agents only; separate real-IO phase uses disposable 10k/2k/30k files. Baseline large probes use isolated --smol children with 8s deadline, not samples.",
    fixtures: { "chain-1000": "1000 reverse-ordered tasks, 999 edges, 1 spec", "chain-10000": "10000 reverse-ordered tasks, 9999 edges, 1 spec", volume: "10000 reverse-ordered tasks, 2000 specs, 30000 existing directed DAG edges; selected middle task" }, sourceHashes, rows, io };
  const path = process.argv[2] ?? "/private/tmp/spm-task136-benchmark.json";
  await writeFile(path, `${JSON.stringify(output, null, 2)}\n`); console.log(path);
}
