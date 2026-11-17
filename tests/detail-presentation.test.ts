import {boundTaskDetail,boundSpecDetail,type BoundedTaskResult,type BoundedSpecResult} from '../src/services/detail-relations.ts';
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
  let TaskDetail: Component<{ detail: BoundedTaskResult;presentation?:"page"|"inspector" }>;
  let SpecDetail: Component<{ detail: BoundedSpecResult; actionResult?: SpecDetailActionResult;presentation?:"page"|"inspector" }>;
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
    await writeFile(join(cache,"state.ts"), 'export const page={url:new URL("http://local/specs"),state:{}};');
    server = await createServer({ configFile: false, root: resolve("web"), cacheDir: cache,
      resolve: { alias: { "$app/state": join(cache,"state.ts") } },
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
    const html = render(TaskDetail, { props: { detail: boundTaskDetail(taskDetail) } }).body;
    expect(html).toContain("Canonical task specimen"); expect(html).toContain("A shared task detail consumer.");
    expect(html).toContain('href="/tasks/TASK-001"'); expect(html).toContain('href="/tasks"');
    expect(html).toContain('href="/specs/SPEC-002"'); expect(html).toContain("implementer");
    expect(html.indexOf("Dependencies and blockers")).toBeLessThan(html.indexOf("Context and links"));
    expect(html.indexOf("Context and links")).toBeLessThan(html.indexOf("Source narrative"));
    expect(html).toContain("No closed-state lifecycle timestamps yet.");
  });

  test("spec rendering preserves ordinary question POST names and source/Mermaid presentation", () => {
    const html = render(SpecDetail, { props: { detail: boundSpecDetail(specDetail) } }).body;
    expect(html).toContain("Canonical detail specimen"); expect(html).toContain("Progress and linked tasks");
    expect(html).toContain('method="POST"'); expect(html).toContain('action="/specs/SPEC-002?/answerOpenQuestions"');
    expect(html).toContain('name="question"'); expect(html).toContain('name="answer"');
    expect(html).toContain("Which ordinary POST remains canonical?"); expect(html).toContain("Save answered questions");
    expect(html).toContain("Resolved decisions"); expect(html).toContain("Diagram rendering requires JavaScript");
    expect(html.indexOf("Answer open questions")).toBeLessThan(html.indexOf("Resolved decisions"));
    expect(html.indexOf("Resolved decisions")).toBeLessThan(html.indexOf("Source narrative"));
  });

  test("inspector presentation keeps reader anchors/Mermaid but sends questions to canonical page",()=>{
    const task=render(TaskDetail,{props:{detail:boundTaskDetail(taskDetail),presentation:'inspector'}}).body;
    for(const section of ['overview','relations','document'])expect(task).toContain(`data-detail-section="${section}"`);
    const spec=render(SpecDetail,{props:{detail:boundSpecDetail(specDetail),presentation:'inspector'}}).body;
    for(const section of ['overview','relations','document','questions','decisions'])expect(spec).toContain(`data-detail-section="${section}"`);
    expect(spec).not.toContain('method="POST"');expect(spec).not.toContain('name="answer"');expect(spec).toContain('data-inspector-full');expect(spec).toContain('/specs/SPEC-002#open-questions');expect(spec).toContain('Diagram rendering requires JavaScript');expect(spec).toContain('Which ordinary POST remains canonical?');
  });

  test("inspector SSR bounds each relation collection and exposes real page links",()=>{
    if(!taskDetail.found)throw new Error('fixture task missing');
    const base=taskDetail.dependencies[0]!;
    const cards=Array.from({length:251},(_,i)=>({...base,id:`TASK-REL-${i+1}`,title:`Related task ${i+1}`}));
    const large={...taskDetail,dependencies:[],linkedSpecs:[],unmetDependencyIds:[],relatedHandoffs:[],blockingTasks:cards};
    const inspector=render(TaskDetail,{props:{detail:boundTaskDetail(large),presentation:'inspector'}}).body.replace(/<!--.*?-->/g,'');
    expect(inspector.match(/data-relation-item/g)).toHaveLength(100);expect(inspector).toContain('1–100 of 251');expect(inspector).toContain(`/tasks/${taskDetail.task.id}?rel.blockingTasks=2`);expect(inspector).not.toContain('<button');
    const canonical=render(TaskDetail,{props:{detail:boundTaskDetail(large)}}).body;expect(canonical.match(/data-relation-item/g)).toHaveLength(100);
  });
  test("Spec inspector uses one100-task window across groups while keeping group metrics",()=>{
    if(!taskDetail.found||!specDetail.found)throw new Error('fixture missing');
    const base=taskDetail.dependencies[0]!,cards=Array.from({length:251},(_,i)=>({...base,id:`TASK-GROUP-${i+1}`,title:`Grouped task ${i+1}`}));
    const large={...specDetail,linkedTasks:cards,linkedTaskGroups:[{id:'a',title:'First group',tasks:cards.slice(0,80)},{id:'b',title:'Second group',tasks:cards.slice(80,170)},{id:'c',title:'Third group',tasks:cards.slice(170)}]};
    const inspector=render(SpecDetail,{props:{detail:boundSpecDetail(large),presentation:'inspector'}}).body.replace(/<!--.*?-->/g,'');
    expect(inspector.match(/data-relation-item/g)).toHaveLength(100);expect(inspector).toContain('First group');expect(inspector).toContain('Second group');expect(inspector).not.toContain('Third group');expect(inspector).toContain('>90</span>');expect(inspector).not.toContain('<button');
    const canonical=render(SpecDetail,{props:{detail:boundSpecDetail(large)}}).body;expect(canonical.match(/data-relation-item/g)).toHaveLength(100);
  });

  test("duplicate IDs retain occurrence identity across every page in both readers",()=>{
    if(!taskDetail.found||!specDetail.found)throw Error('fixture');
    const base=taskDetail.dependencies[0]!,cards=Array.from({length:205},()=>({...base,id:'TASK-DUP'}));
    const task={...taskDetail,dependencies:cards,blockingTasks:[],linkedSpecs:[],relatedHandoffs:[],unmetDependencyIds:[]};
    const spec={...specDetail,linkedTasks:cards,linkedTaskGroups:[{id:'todo',title:'Todo',tasks:cards}],relatedHandoffs:[]};
    for(const page of [1,2,3]){
      const expected=page===3?5:100;
      const a=render(TaskDetail,{props:{detail:boundTaskDetail(task,{dependencies:page})}}).body,b=render(SpecDetail,{props:{detail:boundSpecDetail(spec,{linkedTasks:page})}}).body;
      expect(a.match(/data-relation-item/g)).toHaveLength(expected);expect(b.match(/data-relation-item/g)).toHaveLength(expected);expect(a).toContain(`Page ${page} of 3`);expect(b).toContain(`Page ${page} of 3`);
    }
  });

  test("existing action failures, saved counts and continuation evaluation remain visible", () => {
    const error = render(SpecDetail, { props: { detail: boundSpecDetail(specDetail), actionResult: { action: "answerOpenQuestions", error: "Add at least one answer before saving." } } }).body;
    expect(error).toContain("Add at least one answer before saving."); expect(error).toContain("Save error");
    const success = render(SpecDetail, { props: { detail: boundSpecDetail(specDetail), actionResult: {
      action: "answerOpenQuestions", success: true, savedCount: 1, answeredQuestions: ["Which ordinary POST remains canonical?"],
      evaluation: { status: "ready-for-follow-up", summary: "Ready for a reviewed follow-up.", nextActions: ["Review the recorded decision."],
        bundle: { recommended_prompt: "Use the canonical continuation context.", expected_output_format: { sections: [], propose_new_questions: true, propose_follow_up_tasks: true } } },
    } } }).body.replace(/<!--.*?-->/g, "");
    expect(success).toContain("1 question resolved"); expect(success).toContain("Continuation guidance");
    expect(success).toContain("Ready for a reviewed follow-up."); expect(success).toContain("Use the canonical continuation context.");
  });

  test("noJS conflict/recovery exposes native acknowledgement and discard without inert JS buttons",()=>{
    const html=render(SpecDetail,{props:{detail:boundSpecDetail(specDetail),actionResult:{error:'Conflict',baseRevision:'0'.repeat(64),submittedDrafts:[{question:'Removed?',answer:' exact recovery '}],recovery:[{question:'Older?',answer:' keep '}]}}}).body;
    expect(html).not.toContain('>Review current version</button>');expect(html).not.toContain('>Discard this recovered answer</button>');expect(html).not.toContain('>Retry current details</button>');
    expect(html).toContain('name="acknowledgedRevision"');expect(html).toContain('name="recoveryAnswer"');expect(html).toContain('value="discardRecovery"');expect(html).toContain(' exact recovery ');
  });

  test("both missing-result variants share coherent not-found and list navigation", () => {
    const task = render(TaskDetail, { props: { detail: { found: false, kind: "task", id: "TASK-MISSING" } } }).body;
    const spec = render(SpecDetail, { props: { detail: { found: false, kind: "spec", id: "SPEC-MISSING" } } }).body;
    expect(task).toContain("Task TASK-MISSING was not found"); expect(task).toContain('href="/tasks"');
    expect(spec).toContain("Spec SPEC-MISSING was not found"); expect(spec).toContain('href="/specs"');
  });
});
