/** TASK-139: Node loader benchmark; callers coordinate a quiet CPU window. */
import { createHash } from "node:crypto";
import { cpus, platform, release } from "node:os";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadProjectContext } from "../src/repository.ts";
import { createWorkspaceSource } from "../src/services/workspace.ts";
import { buildTaskDetailFromContext } from "../src/services/details.ts";
const [baselineRoot, fixtureRoot, output] = process.argv.slice(2);
if (!baselineRoot || !fixtureRoot || !output) throw new Error("Usage: node scripts/project-read-benchmark.ts <baseline-source-root> <fixture-root> <report.json>");
const baselineRepository = await import(pathToFileURL(resolve(baselineRoot, "src/repository.ts")).href);
const baselineWorkspace = await import(pathToFileURL(resolve(baselineRoot, "src/services/workspace.ts")).href);
const baselineDetail = await import(pathToFileURL(resolve(baselineRoot, "src/services/details.ts")).href);
const hash = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const warmups = 5, sampleCount = 20;
const results: Array<Record<string, unknown>> = [];
let expectedContext: string | undefined, expectedRevision: string | undefined;
const startedAt = new Date().toISOString();
for (const [name, load, workspace, detail] of [
  ["baseline", baselineRepository.loadProjectContext, baselineWorkspace.createWorkspaceSource, baselineDetail.buildTaskDetailFromContext],
  ["production", loadProjectContext, createWorkspaceSource, buildTaskDetailFromContext],
] as const) {
  const samples: Array<Record<string, number | string>> = [];
  for (let n = -warmups; n < sampleCount; n += 1) {
    const start = performance.now(), context = await load(fixtureRoot), loaded = performance.now();
    const source = workspace(context, 0), indexed = performance.now();
    const projection = detail(context, "TASK-00001", source.analysis), projected = performance.now();
    const serialized = JSON.stringify(projection), serializedAt = performance.now();
    // Full context-value equality and byte-backed revision equality are outside timed phases.
    const contextHash = hash(JSON.stringify(context));
    expectedContext ??= contextHash; expectedRevision ??= source.revision;
    if (contextHash !== expectedContext || source.revision !== expectedRevision) throw new Error(`${name}: context/revision differs from baseline`);
    if (n >= 0) samples.push({ contextMs: loaded - start, indexMs: indexed - loaded, projectionMs: projected - indexed, stringifyMs: serializedAt - projected,
      bytes: Buffer.byteLength(serialized), taskCount: context.tasks.length, specCount: context.specs.length, sessionCount: context.sessionNotes.length, orgCount: context.orgNotes.length, contextHash, revision: source.revision });
  }
  const summary = Object.fromEntries(["contextMs", "indexMs", "projectionMs", "stringifyMs"].map(key => {
    const sorted = samples.map(sample => sample[key] as number).sort((a, b) => a - b);
    return [key, { median: (sorted[9]! + sorted[10]!) / 2, p95: sorted[18]! }];
  }));
  results.push({ implementation: name, summary, samples });
}
const sourceFiles = ["src/document-reader.ts", "src/repository.ts", "scripts/project-read-benchmark.ts"];
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, hash(await readFile(new URL(`../${path}`, import.meta.url)))])));
const report = { baselineCommit: "896ce55779f8250af89821e7dd8de95ca0cffa8f", runtime: process.version, machine: { cpu: cpus()[0]?.model, platform: platform(), release: release(), arch: process.arch },
  startedAt, finishedAt: new Date().toISOString(), warmups, sampleCount, sourceHashes, baselineRepositorySha256: hash(await readFile(resolve(baselineRoot, "src/repository.ts"))),
  scope: "Final production code, no instrumentation globals. Fresh context each sample; Node baseline then production serially. Median mean of sorted10th/11th, nearest-rank p95. Context equality/revision checks outside timed phases. Context/index/projection/stringification only; no HTTP/render/OS-cold or <=300ms acceptance claim. Timing fixture has zero scoped notes; enabled-scope correctness is a separate test.", results };
await writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ output, results: results.map(result => ({ implementation: result.implementation, summary: result.summary })) }));
