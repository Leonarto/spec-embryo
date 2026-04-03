import type { ResumeContext } from "../domain.ts";
import type { BackendRunOptions, BackendRunResult, ResumeBackend } from "./base.ts";

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
  recommended_prompt: string;
  expected_output_format: {
    summary_sections: string[];
    require_explicit_file_refs: boolean;
    prefer_deterministic_updates: boolean;
  };
  subtask_prompts: Array<{
    task_id: string;
    prompt: string;
  }>;
}

export function buildPromptBundle(context: ResumeContext): PromptBundle {
  return {
    context: {
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
    },
    recommended_prompt: [
      "You are resuming work on this repository.",
      `Current focus: ${context.focus}`,
      "Use the structured context provided by Spec Embryo as the source of truth.",
      "Do not restate everything. First answer:",
      "1. where the project currently is",
      "2. what should happen next",
      "3. what is blocked or risky",
      "4. which files/docs should be updated as part of the next slice",
      "Then propose the smallest high-value next implementation step.",
    ].join("\n"),
    expected_output_format: {
      summary_sections: ["where-we-are", "next-step", "blockers", "docs-to-touch"],
      require_explicit_file_refs: true,
      prefer_deterministic_updates: true,
    },
    subtask_prompts: context.readyTasks.slice(0, 3).map((entry) => ({
      task_id: entry.task.id,
      prompt: `Work on ${entry.task.id} (${entry.task.title}). Keep changes aligned with spec-backed files and update current state if the focus changes.`,
    })),
  };
}

export function renderPromptBundleText(bundle: PromptBundle): string {
  return [
    bundle.recommended_prompt,
    "",
    "Expected output format:",
    JSON.stringify(bundle.expected_output_format, null, 2),
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
