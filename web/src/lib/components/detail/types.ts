/** Existing canonical question-action response projected by the route. */
export interface SpecDetailActionResult {
  action?: string;
  error?: string;
  submittedDrafts?: QuestionDraft[];
  recovery?: QuestionDraft[];
  baseRevision?: string;
  currentRevision?: string | null;
  committedRevision?: string;
  committedQuestions?: Array<{question:string}>;
  currentQuestions?: Array<{id:string;question:string}>;
  currentDecisions?: Array<{id:string;question?:string;answer:string}>;
  refreshWarning?: string;
  redisplay?: boolean;
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

export interface QuestionDraft {question:string;answer:string}
