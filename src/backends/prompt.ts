import type { ResumeContext } from "../domain.ts";
import type { BackendRunOptions, BackendRunResult, ResumeBackend } from "./base.ts";
import { buildResumeContextPack, type ContextPackBundle } from "../services/context-pack.ts";

export interface PromptBundle {
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

function buildRecommendedPrompt(context: ResumeContext): string {
  return [
    "You are resuming work on this repository.",
    `Current focus: ${context.focus}`,
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

function stableRepoContext(context: PromptBundle["context"]) {
  return {
    project_name: context.project_name,
    focus: context.focus,
    summary: context.summary,
    active_specs: context.active_specs,
    critical_path: context.critical_path,
  };
}

function volatileExecutionContext(context: PromptBundle["context"]) {
  return {
    active_tasks: context.active_tasks,
    blocked_tasks: context.blocked_tasks,
    review_tasks: context.review_tasks,
    ready_tasks: context.ready_tasks,
    recent_handoff: context.recent_handoff,
    git: context.git,
    changed_items: context.changed_items,
    next_actions: context.next_actions,
  };
}

function buildCacheAssembly(
  context: PromptBundle["context"],
  contextPack: ContextPackBundle,
  recommendedPrompt: string,
  expectedOutputFormat: PromptBundle["expected_output_format"],
  subtaskPrompts: PromptBundle["subtask_prompts"],
): PromptBundle["cache_assembly"] {
  const stablePrefixText = [
    recommendedPrompt,
    "",
    "Expected output format:",
    JSON.stringify(expectedOutputFormat, null, 2),
    "",
    "Context pack:",
    JSON.stringify(contextPack, null, 2),
    "",
    "Stable repo context:",
    JSON.stringify(stableRepoContext(context), null, 2),
  ].join("\n");

  const variableTailText = [
    "Volatile execution context:",
    JSON.stringify(volatileExecutionContext(context), null, 2),
    "",
    "Subtask prompts:",
    JSON.stringify(subtaskPrompts, null, 2),
  ].join("\n");

  return {
    strategy: "stable-prefix-and-tail",
    stable_prefix_sections: ["recommended_prompt", "expected_output_format", "context_pack", "stable_repo_context"],
    variable_tail_sections: ["volatile_execution_context", "subtask_prompts"],
    stable_prefix_text: stablePrefixText,
    variable_tail_text: variableTailText,
  };
}

export function buildPromptBundle(context: ResumeContext): PromptBundle {
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
  const recommendedPrompt = buildRecommendedPrompt(context);
  const expectedOutputFormat = buildExpectedOutputFormat();
  const subtaskPrompts = context.readyTasks.slice(0, 3).map((entry) => ({
    task_id: entry.task.id,
    prompt: `Work on ${entry.task.id} (${entry.task.title}). Keep changes aligned with spec-backed files and update current state if the focus changes.`,
  }));

  return {
    context: contextData,
    context_pack: contextPack,
    recommended_prompt: recommendedPrompt,
    expected_output_format: expectedOutputFormat,
    cache_assembly: buildCacheAssembly(
      contextData,
      contextPack,
      recommendedPrompt,
      expectedOutputFormat,
      subtaskPrompts,
    ),
    subtask_prompts: subtaskPrompts,
  };
}

export function renderPromptBundleText(bundle: PromptBundle): string {
  return [
    bundle.cache_assembly.stable_prefix_text,
    "",
    bundle.cache_assembly.variable_tail_text,
    "",
    "Structured context:",
    JSON.stringify(bundle.context, null, 2),
  ].join("\n");
}

export class PromptBackend implements ResumeBackend {
  name = "prompt" as const;

  async run(context: ResumeContext, options: BackendRunOptions): Promise<BackendRunResult> {
    const bundle = buildPromptBundle(context);
    const jsonText = JSON.stringify(bundle, null, 2);
    const text = ["Prompt-return bundle", "", "Recommended prompt:", renderPromptBundleText(bundle)].join("\n");

    return {
      text: options.json ? jsonText : text,
      json: bundle,
    };
  }
}
