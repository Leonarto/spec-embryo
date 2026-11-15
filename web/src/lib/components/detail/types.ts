/** Existing canonical question-action response projected by the route. */
export interface SpecDetailActionResult {
  action?: string;
  error?: string;
  success?: boolean;
  savedCount?: number;
  answeredQuestions?: string[];
  evaluation?: {
    status: "needs-more-input" | "ready-for-follow-up";
    summary: string;
    nextActions: string[];
    bundle: {
      recommended_prompt: string;
      expected_output_format: {
        sections: string[];
        propose_new_questions: boolean;
        propose_follow_up_tasks: boolean;
      };
    };
  };
}
