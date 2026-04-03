import { describe, expect, test } from "bun:test";
import type { SpecDocument } from "../src/domain.ts";
import { buildSpecAnswerEvaluation } from "../src/services/spec-answer-evaluation.ts";

describe("spec answer evaluation", () => {
  test("marks specs with remaining questions as needing more input", () => {
    const spec: SpecDocument = {
      docKind: "spec",
      id: "SPEC-999",
      title: "Answer flow",
      summary: "Track sufficiency after answers are saved.",
      status: "active",
      taskIds: [],
      tags: [],
      body: "# Overview\n",
      filePath: "/tmp/spec.md",
    };

    const evaluation = buildSpecAnswerEvaluation({
      spec,
      linkedTasks: [],
      answeredQuestions: ["What should happen next?"],
      remainingOpenQuestions: [{ id: "open-question-2", question: "Should new questions be proposed?" }],
      resolvedDecisions: [{ id: "resolved-decision-1", question: "What should happen next?", answer: "Create tasks." }],
    });

    expect(evaluation.status).toBe("needs-more-input");
    expect(evaluation.nextActions[0]).toContain("remaining open questions");
    expect(evaluation.bundle.context.remaining_open_questions).toEqual(["Should new questions be proposed?"]);
  });
});
