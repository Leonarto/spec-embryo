import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer, type ViteDevServer } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import type { Component } from "svelte";
import type { render as Render } from "svelte/server";
import { createSpec, createTask, initializeProject } from "../src/repository.ts";
import { buildSpecDetailData, buildTaskDetailData, type SpecDetailResult, type TaskDetailResult } from "../src/services/details.ts";
import type { SpecDetailActionResult } from "../web/src/lib/components/detail/types.ts";

describe("canonical detail presentation", () => {
  let server: ViteDevServer;
  let root: string;
  let cache: string;
  let render: typeof Render;
  let TaskDetail: Component<{ detail: TaskDetailResult }>;
  let SpecDetail: Component<{ detail: SpecDetailResult; actionResult?: SpecDetailActionResult }>;
  let taskDetail: TaskDetailResult;
  let specDetail: SpecDetailResult;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "spm-detail-presentation-"));
    cache = await mkdtemp(join(tmpdir(), "spm-detail-ssr-cache-"));
    await initializeProject(root);
    const spec = await createSpec(root, { title: "Canonical detail specimen", summary: "A shared spec detail consumer.", status: "active", tags: ["detail"] });
    await writeFile(spec.filePath, `${await readFile(spec.filePath, "utf8")}\n\n## Open Questions\n\n- Which ordinary POST remains canonical?\n\n## Diagram\n\n\`\`\`mermaid\nflowchart LR\n  Input --> Context\n\`\`\`\n`);
    const task = await createTask(root, { title: "Canonical task specimen", summary: "A shared task detail consumer.", status: "blocked", priority: 1,
      specIds: [spec.id], dependsOn: ["TASK-001"], ownerRole: "implementer", tags: ["detail"] });
    taskDetail = await buildTaskDetailData(root, task.id); specDetail = await buildSpecDetailData(root, spec.id);
    server = await createServer({ configFile: false, root: resolve("web"), cacheDir: cache,
      plugins: [svelte({ configFile: false })], server: { middlewareMode: true, hmr: false, ws: false },
      ssr: { noExternal: ["svelte", "@lucide/svelte"] }, optimizeDeps: { noDiscovery: true }, logLevel: "error" });
    const [taskModule, specModule, runtime] = await Promise.all([
      server.ssrLoadModule("/src/lib/components/detail/TaskDetail.svelte"),
      server.ssrLoadModule("/src/lib/components/detail/SpecDetail.svelte"), server.ssrLoadModule("svelte/server"),
    ]);
    TaskDetail = taskModule.default; SpecDetail = specModule.default; render = runtime.render;
  }, 30000);

  afterAll(async () => {
    await server?.close();
    if (root) await rm(root, { recursive: true, force: true });
    if (cache) await rm(cache, { recursive: true, force: true });
  });

  test("task rendering preserves canonical links, section order and existing domain values", () => {
    const html = render(TaskDetail, { props: { detail: taskDetail } }).body;
    expect(html).toContain("Canonical task specimen"); expect(html).toContain("A shared task detail consumer.");
    expect(html).toContain('href="/tasks/TASK-001"'); expect(html).toContain('href="/tasks"');
    expect(html).toContain('href="/specs/SPEC-002"'); expect(html).toContain("implementer");
    expect(html.indexOf("Dependencies and blockers")).toBeLessThan(html.indexOf("Context and links"));
    expect(html.indexOf("Context and links")).toBeLessThan(html.indexOf("Source narrative"));
    expect(html).toContain("No closed-state lifecycle timestamps yet.");
  });

  test("spec rendering preserves ordinary question POST names and source/Mermaid presentation", () => {
    const html = render(SpecDetail, { props: { detail: specDetail } }).body;
    expect(html).toContain("Canonical detail specimen"); expect(html).toContain("Progress and linked tasks");
    expect(html).toContain('method="POST"'); expect(html).toContain('action="?/answerOpenQuestions"');
    expect(html).toContain('name="question"'); expect(html).toContain('name="answer"');
    expect(html).toContain("Which ordinary POST remains canonical?"); expect(html).toContain("Save answered questions");
    expect(html).toContain("Resolved decisions"); expect(html).toContain("Rendering Mermaid diagram");
    expect(html.indexOf("Answer open questions")).toBeLessThan(html.indexOf("Resolved decisions"));
    expect(html.indexOf("Resolved decisions")).toBeLessThan(html.indexOf("Source narrative"));
  });

  test("existing action failures, saved counts and continuation evaluation remain visible", () => {
    const error = render(SpecDetail, { props: { detail: specDetail, actionResult: { action: "answerOpenQuestions", error: "Add at least one answer before saving." } } }).body;
    expect(error).toContain("Add at least one answer before saving."); expect(error).toContain("save error");
    const success = render(SpecDetail, { props: { detail: specDetail, actionResult: {
      action: "answerOpenQuestions", success: true, savedCount: 1, answeredQuestions: ["Which ordinary POST remains canonical?"],
      evaluation: { status: "ready-for-follow-up", summary: "Ready for a reviewed follow-up.", nextActions: ["Review the recorded decision."],
        bundle: { recommended_prompt: "Use the canonical continuation context.", expected_output_format: { sections: [], propose_new_questions: true, propose_follow_up_tasks: true } } },
    } } }).body.replace(/<!--.*?-->/g, "");
    expect(success).toContain("1 answer recorded"); expect(success).toContain("Continuation guidance");
    expect(success).toContain("Ready for a reviewed follow-up."); expect(success).toContain("Use the canonical continuation context.");
  });

  test("both missing-result variants preserve their fallback choices", () => {
    const task = render(TaskDetail, { props: { detail: { found: false, kind: "task", id: "TASK-MISSING", availableIds: ["TASK-001"] } } }).body;
    const spec = render(SpecDetail, { props: { detail: { found: false, kind: "spec", id: "SPEC-MISSING", availableIds: ["SPEC-001"] } } }).body;
    expect(task).toContain("Task TASK-MISSING was not found"); expect(task).toContain('href="/tasks/TASK-001"');
    expect(spec).toContain("Spec SPEC-MISSING was not found"); expect(spec).toContain('href="/specs/SPEC-001"');
  });
});
