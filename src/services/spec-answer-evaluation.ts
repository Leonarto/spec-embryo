import type { SpecDocument, TaskDocument } from "../domain.ts";
import type { DetailLinkedTask, ResolvedDecisionDetail, SpecOpenQuestionDetail } from "./details.ts";

export interface SpecAnswerEvaluationBundle {
  context: {
    spec: {
      id: string;
      title: string;
      status: string;
      summary: string;
      task_ids: string[];
    };
    answered_questions: string[];
    remaining_open_questions: string[];
    resolved_decision_count: number;
    linked_tasks: Array<{
      id: string;
      title: string;
      status: string;
      priority: number;
    }>;
  };
  recommended_prompt: string;
  expected_output_format: {
    sections: string[];
    propose_new_questions: boolean;
    propose_follow_up_tasks: boolean;
  };
}

export interface SpecAnswerEvaluation {
  status: "needs-more-input" | "ready-for-follow-up";
  summary: string;
  nextActions: string[];
  bundle: SpecAnswerEvaluationBundle;
}

export function buildSpecAnswerEvaluation(input: {
  spec: SpecDocument;
  linkedTasks: DetailLinkedTask[];
  answeredQuestions: string[];
  remainingOpenQuestions: SpecOpenQuestionDetail[];
  resolvedDecisions: ResolvedDecisionDetail[];
}): SpecAnswerEvaluation {
  const { spec, linkedTasks, answeredQuestions, remainingOpenQuestions, resolvedDecisions } = input;
  const readyForFollowUp = remainingOpenQuestions.length === 0;
  const nextActions: string[] = [];

  if (remainingOpenQuestions.length > 0) {
    nextActions.push("Review the remaining open questions and answer the next highest-leverage ones.");
  } else {
    nextActions.push("Review the updated spec for sections that should now be tightened with the new decisions.");
  }

  if (linkedTasks.length === 0) {
    nextActions.push("Create one or more tasks from the newly decided scope.");
  } else {
    nextActions.push("Check whether linked tasks should be created, split, or reprioritized based on the new decisions.");
  }

  nextActions.push("Run an agent review over the updated spec to decide whether the information is sufficient or whether new open questions should be added.");

  return {
    status: readyForFollowUp ? "ready-for-follow-up" : "needs-more-input",
    summary: readyForFollowUp
      ? "The spec no longer has open questions in this section. It is ready for follow-up planning or deeper narrative refinement."
      : "The spec still has open questions. The saved answers should guide the next clarification pass rather than being treated as final closure.",
    nextActions,
    bundle: {
      context: {
        spec: {
          id: spec.id,
          title: spec.title,
          status: spec.status,
          summary: spec.summary,
          task_ids: spec.taskIds,
        },
        answered_questions: answeredQuestions,
        remaining_open_questions: remainingOpenQuestions.map((entry) => entry.question),
        resolved_decision_count: resolvedDecisions.length,
        linked_tasks: linkedTasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.effectiveStatus,
          priority: task.priority,
        })),
      },
      recommended_prompt: [
        `You are reviewing ${spec.id} (${spec.title}) after a user answered open questions in the UI.`,
        "Use the provided context as the current source of truth.",
        "Decide whether the spec now has enough information to continue.",
        "If it still lacks important detail, propose a small set of new open questions.",
        "If it is sufficient, propose the next tasks or spec refinements that should happen now.",
        "Do not rewrite files directly in this pass; return recommendations only.",
      ].join("\n"),
      expected_output_format: {
        sections: ["sufficiency", "recommended-next-steps", "proposed-new-open-questions", "proposed-task-slices"],
        propose_new_questions: true,
        propose_follow_up_tasks: true,
      },
    },
  };
}
