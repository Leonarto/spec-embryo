import type { ResumeContext } from "../domain.ts";
import type { BackendRunOptions, BackendRunResult, ResumeBackend } from "./base.ts";
import { buildResumeContextPack, type ContextPackBundle } from "../services/context-pack.ts";
import { STRUCTURED_OUTPUT_SCHEMA_VERSION } from "../services/contracts.ts";
import { boundResumeText, DEFAULT_MAX_CONTEXT_BYTES } from "../services/resume-render.ts";

export interface PromptBundle {
  schema_version: string;
  context_snapshot?: ResumeContext["context_snapshot"];
  interruption_window?: ResumeContext["interruption_window"];
  warnings: string[];
  context: {
    project_name: string;
    focus: string;
    summary: string;
    active_specs: Array<{
      id: string;
      title: string;
      status: string;
      task_ids: string[];
    }>;
    active_tasks: Array<{
      id: string;
      title: string;
      status: string;
      spec_ids: string[];
      unmet_dependencies: string[];
      priority: number;
    }>;
    blocked_tasks: Array<{
      id: string;
      title: string;
      unmet_dependencies: string[];
    }>;
    review_tasks: Array<{
      id: string;
      title: string;
      status: string;
      priority: number;
    }>;
    ready_tasks: Array<{
      id: string;
      title: string;
      priority: number;
    }>;
    critical_path: string[];
    recent_handoff: {
      id: string;
      title: string;
      created_at: string;
      summary: string;
    } | null;
    git: {
      branch: string | null;
      dirty: boolean;
      last_commit: string | null;
      short_status: string[];
    };
    changed_items: ResumeContext["changedItems"];
    next_actions: string[];
  };
  context_pack: ContextPackBundle;
  recommended_prompt: string;
  expected_output_format: {
    summary_sections: string[];
    require_explicit_file_refs: boolean;
    prefer_deterministic_updates: boolean;
      context_pack_first: boolean;
  };
  cache_assembly: {
    strategy: "stable-prefix-and-tail";
    stable_prefix_sections: string[];
    variable_tail_sections: string[];
    stable_prefix_text: string;
    variable_tail_text: string;
  };
  subtask_prompts: Array<{
    task_id: string;
    prompt: string;
  }>;
}

function buildRecommendedPrompt(): string {
  return [
    "You are resuming work on this repository.",
    "Use the structured context provided by Spec Embryo as the source of truth.",
    "Start from the context pack first, then expand into supporting context only if needed.",
    "Do not restate everything. First answer:",
    "1. where the project currently is",
    "2. what should happen next",
    "3. what is blocked or risky",
    "4. which files/docs should be updated as part of the next slice",
    "Then propose the smallest high-value next implementation step.",
  ].join("\n");
}

function buildExpectedOutputFormat(): PromptBundle["expected_output_format"] {
  return {
    summary_sections: ["where-we-are", "next-step", "blockers", "docs-to-touch"],
    require_explicit_file_refs: true,
    prefer_deterministic_updates: true,
    context_pack_first: true,
  };
}

function buildCacheAssembly(
  context: PromptBundle["context"],
  contextPack: ContextPackBundle,
  recommendedPrompt: string,
  expectedOutputFormat: PromptBundle["expected_output_format"],
  subtaskPrompts: PromptBundle["subtask_prompts"],
  resumeContext: ResumeContext,
  warnings: string[],
  maxBytes: number,
): { assembly: PromptBundle["cache_assembly"]; warnings: string[] } {
  const stablePrefixText = [
    recommendedPrompt,
    "",
    "Expected output format:",
    JSON.stringify(expectedOutputFormat, null, 2),
  ].join("\n");

  const variableTailText = [
    "Context pack:",
    JSON.stringify(contextPack, null, 2),
    "",
    "Structured context:",
    JSON.stringify(context, null, 2),
    ...(resumeContext.interruption_window ? ["", "Interruption window (committed changes only):",
      JSON.stringify(resumeContext.interruption_window, null, 2)] : []),
    ...(resumeContext.context_snapshot ? ["", "Context snapshot (selected sources; not an atomic filesystem snapshot):",
      JSON.stringify(resumeContext.context_snapshot, null, 2)] : []),
    "",
    "Subtask prompts:",
    JSON.stringify(subtaskPrompts, null, 2),
    "",
    "Warnings:",
    JSON.stringify(warnings, null, 2),
  ].join("\n");
  const bounded = boundResumeText({ stablePrefix: stablePrefixText, fullTail: variableTailText,
    projectName: context.project_name, focus: context.focus, summary: context.summary,
    blocked: context.blocked_tasks,
    references: [
      ...context.active_specs.map((entry) => ({ kind: "managed-doc", ref: entry.id })),
      ...context.active_tasks.map((entry) => ({ kind: "managed-doc", ref: entry.id })),
      ...context.blocked_tasks.map((entry) => ({ kind: "managed-doc", ref: entry.id })),
      ...contextPack.nextInspect.map((entry) => ({ kind: entry.kind, ref: entry.ref })),
      ...contextPack.offloaded.map((entry) => ({ kind: entry.kind, ref: entry.ref })),
      ...context.changed_items.map((entry) => ({ kind: "change-path", ref: entry.path })),
    ], warnings, interruptionWindow: resumeContext.interruption_window }, maxBytes);
  return { warnings: bounded.warnings, assembly: {
    strategy: "stable-prefix-and-tail",
    stable_prefix_sections: ["recommended_prompt", "expected_output_format"],
    variable_tail_sections: ["context_pack", "context", "interruption_window", "context_snapshot", "subtask_prompts", "warnings"],
    stable_prefix_text: stablePrefixText,
    variable_tail_text: bounded.tail,
  } };
}

export function buildPromptBundle(context: ResumeContext, maxBytes = DEFAULT_MAX_CONTEXT_BYTES): PromptBundle {
  const contextPack = buildResumeContextPack(context);
  const contextData: PromptBundle["context"] = {
    project_name: context.projectName,
    focus: context.focus,
    summary: context.summary,
    active_specs: context.activeSpecs.map((spec) => ({
      id: spec.id,
      title: spec.title,
      status: spec.status,
      task_ids: spec.taskIds,
    })),
    active_tasks: context.activeTasks.map((entry) => ({
      id: entry.task.id,
      title: entry.task.title,
      status: entry.task.status,
      spec_ids: entry.task.specIds,
      unmet_dependencies: entry.unmetDependencies,
      priority: entry.task.priority,
    })),
    blocked_tasks: context.blockedTasks.map((entry) => ({
      id: entry.task.id,
      title: entry.task.title,
      unmet_dependencies: entry.unmetDependencies,
    })),
    review_tasks: context.reviewTasks.map((entry) => ({
      id: entry.task.id,
      title: entry.task.title,
      status: entry.task.status,
      priority: entry.task.priority,
    })),
    ready_tasks: context.readyTasks.map((entry) => ({
      id: entry.task.id,
      title: entry.task.title,
      priority: entry.task.priority,
    })),
    critical_path: context.criticalPath.map((task) => task.id),
    recent_handoff: context.recentHandoff
      ? {
          id: context.recentHandoff.id,
          title: context.recentHandoff.title,
          created_at: context.recentHandoff.createdAt,
          summary: context.recentHandoff.summary,
        }
      : null,
    git: {
      branch: context.git.branch ?? null,
      dirty: context.git.dirty,
      last_commit: context.git.lastCommit ?? null,
      short_status: context.git.shortStatus,
    },
    changed_items: context.changedItems,
    next_actions: context.nextActions,
  };
  const recommendedPrompt = buildRecommendedPrompt();
  const expectedOutputFormat = buildExpectedOutputFormat();
  const subtaskPrompts = context.readyTasks.slice(0, 3).map((entry) => ({
    task_id: entry.task.id,
    prompt: `Work on ${entry.task.id} (${entry.task.title}). Keep changes aligned with spec-backed files and update current state if the focus changes.`,
  }));

  const warnings = [...(context.warnings ?? [])];
  if (contextPack.offloaded.length) warnings.push(`${contextPack.offloaded.length} context references offloaded; expand via context_pack.nextInspect or spm resume --backend prompt --json.`);
  const { assembly, warnings: renderedWarnings } = buildCacheAssembly(contextData, contextPack, recommendedPrompt,
    expectedOutputFormat, subtaskPrompts, context, warnings, maxBytes);
  return {
    schema_version: STRUCTURED_OUTPUT_SCHEMA_VERSION,
    ...(context.context_snapshot ? { context_snapshot: context.context_snapshot } : {}),
    ...(context.interruption_window ? { interruption_window: context.interruption_window } : {}),
    warnings: renderedWarnings,
    context: contextData,
    context_pack: contextPack,
    recommended_prompt: recommendedPrompt,
    expected_output_format: expectedOutputFormat,
    cache_assembly: assembly,
    subtask_prompts: subtaskPrompts,
  };
}

export function renderPromptBundleText(bundle: PromptBundle): string {
  return [
    bundle.cache_assembly.stable_prefix_text,
    "",
    bundle.cache_assembly.variable_tail_text,
  ].join("\n");
}

export class PromptBackend implements ResumeBackend {
  name = "prompt" as const;

  async run(context: ResumeContext, options: BackendRunOptions): Promise<BackendRunResult> {
    const bundle = buildPromptBundle(context, options.maxContextBytes);
    const jsonText = JSON.stringify(bundle, null, 2);
    const text = renderPromptBundleText(bundle);

    return {
      text: options.json ? jsonText : text,
      json: bundle,
    };
  }
}
