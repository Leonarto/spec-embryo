import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { answerSpecOpenQuestions, loadProjectContext } from "../../../../../src/repository.ts";
import { buildSpecAnswerEvaluation } from "../../../../../src/services/spec-answer-evaluation.ts";
import { buildSpecDetailData } from "../../../../../src/services/details.ts";
import { resolveProjectRoot } from "../../../lib/server/project-root.ts";

export const load: PageServerLoad = async ({ params }) => {
  const rootDir = resolveProjectRoot();
  const detail = await buildSpecDetailData(rootDir, params.specId);

  return {
    detail,
  };
};

export const actions: Actions = {
  answerOpenQuestions: async ({ params, request }) => {
    const rootDir = resolveProjectRoot();
    const formData = await request.formData();
    const specId = params.specId;
    const questions = formData.getAll("question");
    const answers = formData.getAll("answer");
    const answeredPairs = questions.flatMap((value, index) => {
      const question = typeof value === "string" ? value.trim() : "";
      const answer = typeof answers[index] === "string" ? answers[index].trim() : "";

      if (!question || !answer) {
        return [];
      }

      return [{ question, answer }];
    });

    if (answeredPairs.length === 0) {
      return fail(400, {
        action: "answerOpenQuestions",
        error: "Add at least one answer before saving.",
      });
    }

    try {
      await answerSpecOpenQuestions(rootDir, specId, answeredPairs);
      const detail = await buildSpecDetailData(rootDir, specId);
      if (!detail.found) {
        return fail(404, {
          action: "answerOpenQuestions",
          error: `Spec ${specId} was not found after the update.`,
        });
      }

      const context = await loadProjectContext(rootDir);
      const spec = context.specs.find((entry) => entry.id === specId);
      if (!spec) {
        return fail(404, {
          action: "answerOpenQuestions",
          error: `Spec ${specId} was not found after the update.`,
        });
      }

      return {
        action: "answerOpenQuestions",
        success: true,
        savedCount: answeredPairs.length,
        answeredQuestions: answeredPairs.map((entry) => entry.question),
        evaluation: buildSpecAnswerEvaluation({
          spec,
          linkedTasks: detail.linkedTasks,
          answeredQuestions: answeredPairs.map((entry) => entry.question),
          remainingOpenQuestions: detail.openQuestions,
          resolvedDecisions: detail.resolvedDecisions,
        }),
      };
    } catch (error) {
      return fail(400, {
        action: "answerOpenQuestions",
        error: error instanceof Error ? error.message : "Failed to answer open questions.",
      });
    }
  },
};
