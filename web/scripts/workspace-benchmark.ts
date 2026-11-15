import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir, platform, release, cpus } from "node:os";
import { join, resolve } from "node:path";
import { initializeProject } from "../../src/repository.ts";
import { buildDashboardData } from "../../src/services/dashboard.ts";

// Reproducible filesystem fixtures. Every write stays in a disposable temp root.
const dataset = process.argv[2] ?? "current";
const sampleCount = Number(process.argv[3] ?? 20);
const warmups = 5;
if (dataset === "--measure") {
  const start = performance.now();
  const data = await buildDashboardData(process.argv[3]!);
  console.log(JSON.stringify({ ms: performance.now() - start, bytes: Buffer.byteLength(JSON.stringify(data)) }));
  process.exit(0);
}
let fixtureRoot: string | undefined;
const id = (kind: string, n: number) => `${kind}-${String(n).padStart(5, "0")}`;
const document = (data: Record<string, unknown>) => `+++\n${Object.entries(data).map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join("\n")}\n+++\n\nFixture document.\n`;

try {
  let root = resolve(import.meta.dir, "../..");
  if (dataset !== "current") {
    fixtureRoot = await mkdtemp(join(tmpdir(), "spm-ui-benchmark-"));
    root = fixtureRoot;
    await initializeProject(root);
    const base = join(root, "docs/spm");
    await Promise.all(["tasks", "specs"].map(async (dir) => {
      await rm(join(base, dir), { recursive: true, force: true });
      await mkdir(join(base, dir));
    }));
    const taskCount = dataset === "actual-like" ? 122 : dataset === "diagnostics" ? 6 : 10_000;
    const specCount = dataset === "actual-like" ? 60 : dataset === "diagnostics" ? 2 : 2_000;
    const writes: Array<[string, string]> = [];
    for (let n = 1; n <= taskCount; n++) {
      const spec = 1 + (n - 1) % specCount;
      const deps = dataset === "chain" ? (n < taskCount ? [id("TASK", n + 1)] : [])
        : dataset === "diagnostics" ? (n === 1 ? [id("TASK", 2)] : n === 2 ? [id("TASK", 1), "TASK-MISSING"] : [])
        : n <= 3 ? Array.from({ length: n - 1 }, (_, i) => id("TASK", i + 1)) : [1, Math.floor(n / 2), Math.floor(n / 3), ...(n === taskCount ? [4,5,6,7,8,9] : [])].map((i) => id("TASK", i));
      writes.push([join(base, "tasks", `${id("TASK", n)}.md`), document({ doc_kind: "task", id: id("TASK", n), title: `Fixture task ${n} · unicode α`, summary: "Deterministic baseline", status: dataset !== "chain" && n % 7 === 0 ? "done" : "todo", priority: 1 + n % 3, spec_ids: [id("SPEC", spec)], depends_on: deps, tags: [], ...(n % 7 === 0 && dataset !== "chain" ? { completed_at: "2026-11-01T12:00:00.000Z" } : {}) })]);
    }
    for (let n = 1; n <= specCount; n++) {
      const taskIds = Array.from({ length: Math.ceil(taskCount / specCount) }, (_, i) => n + i * specCount).filter((i) => i <= taskCount).map((i) => id("TASK", i));
      writes.push([join(base, "specs", `${id("SPEC", n)}.md`), document({ doc_kind: "spec", id: id("SPEC", n), title: `Fixture spec ${n}`, summary: "Deterministic baseline", status: "active", task_ids: taskIds, tags: [] })]);
    }
    for (let start = 0; start < writes.length; start += 100) await Promise.all(writes.slice(start, start + 100).map(([path, text]) => writeFile(path, text)));
  }
  const samples: number[] = [];
  let bytes = 0;
  let cold = 0;
  for (let n = -warmups; n < sampleCount; n++) {
    // Bound every service invocation; pathological graphs must become evidence,
    // rather than a benchmark that keeps a review session busy indefinitely.
    const child = Bun.spawn([process.execPath, import.meta.path, "--measure", root], { stdout: "pipe", stderr: "pipe" });
    const timer = setTimeout(() => child.kill(), 10_000);
    const [output, error, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    clearTimeout(timer);
    if (code !== 0) {
      console.log(JSON.stringify({ dataset, failed: true, attemptedSample: n + warmups + 1, completedSamples: samples.length, timeoutMs: 10_000, exitCode: code, error: error.slice(0, 2400), runtime: Bun.version, os: `${platform()} ${release()}`, cpu: cpus()[0]?.model }, null, 2));
      process.exitCode = 1;
      break;
    }
    const measured = JSON.parse(output) as { ms: number; bytes: number };
    const elapsed = measured.ms;
    if (n === -warmups) cold = elapsed;
    if (n >= 0) samples.push(elapsed);
    bytes = measured.bytes;
  }
  samples.sort((a, b) => a - b);
  if (!process.exitCode) console.log(JSON.stringify({ dataset, runtime: Bun.version, os: `${platform()} ${release()}`, cpu: cpus()[0]?.model, warmups, sampleCount, processFirstReadMs: cold, medianMs: samples[Math.floor(samples.length / 2)], p95Ms: samples[Math.ceil(samples.length * .95) - 1], payloadBytes: bytes, samplesMs: samples }, null, 2));
} finally {
  if (fixtureRoot) await rm(fixtureRoot, { recursive: true, force: true });
}
