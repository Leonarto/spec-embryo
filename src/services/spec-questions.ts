export interface MarkdownSection {
  heading: string;
  depth: number;
  lines: string[];
}

export interface SplitMarkdownSectionsResult {
  preamble: string[];
  sections: MarkdownSection[];
}

export interface SpecOpenQuestion {
  id: string;
  question: string;
}

export interface ResolvedDecisionEntry {
  id: string;
  question?: string;
  answer: string;
}

export interface ParsedSpecQuestionSections {
  openQuestions: SpecOpenQuestion[];
  resolvedDecisions: ResolvedDecisionEntry[];
}

export interface SpecAnswerInput {
  question: string;
  answer: string;
}

export interface AppliedSpecAnswers {
  body: string;
  answeredQuestions: string[];
  remainingQuestions: SpecOpenQuestion[];
  resolvedDecisions: ResolvedDecisionEntry[];
}

function normalizeHeading(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ");
}

export function normalizeQuestion(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export type SpecQuestionWriteCode = "not_found" | "conflict" | "validation";
export type SpecQuestionWriteReason = "revision" | "question" | "target_changed" | "expected_revision" | "answers";
export class SpecQuestionWriteError extends Error {
  constructor(readonly code: SpecQuestionWriteCode, message: string, readonly reason?: SpecQuestionWriteReason) {
    super(message);
    this.name = "SpecQuestionWriteError";
  }
}

/** Preserve input order; equal duplicate answers resolve all matching question occurrences. */
export function normalizeSpecAnswers(answers: SpecAnswerInput[]): SpecAnswerInput[] {
  if (!Array.isArray(answers) || answers.some(answer => !answer || typeof answer.question !== "string" || typeof answer.answer !== "string")) {
    throw new SpecQuestionWriteError("validation", "Answers must contain question and answer text.", "answers");
  }
  const normalized = answers.map(answer => ({question: normalizeQuestion(answer.question), answer: answer.answer.trim()}))
    .filter(answer => answer.question.length > 0 && answer.answer.length > 0);
  if (normalized.length === 0) throw new SpecQuestionWriteError("validation", "At least one answered question is required.", "answers");
  const seen = new Map<string, string>();
  for (const answer of normalized) {
    if (seen.has(answer.question) && seen.get(answer.question) !== answer.answer) {
      throw new SpecQuestionWriteError("validation", "Conflicting answers for the same open question.", "answers");
    }
    seen.set(answer.question, answer.answer);
  }
  return normalized;
}

function splitSectionItems(lines: string[]): string[][] {
  const items: string[][] = [];
  let current: string[] = [];
  let currentMode: "bullet" | "paragraph" | undefined;

  function flush() {
    if (current.length === 0) {
      return;
    }

    items.push(current.map((line) => line.trimEnd()));
    current = [];
    currentMode = undefined;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      flush();
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      flush();
      currentMode = "bullet";
      current.push(bulletMatch[1]!.trim());
      continue;
    }

    if (!currentMode) {
      currentMode = "paragraph";
    }

    current.push(currentMode === "bullet" ? trimmed : trimmed);
  }

  flush();
  return items;
}

function parseQuestionBlock(lines: string[], index: number): SpecOpenQuestion | undefined {
  const question = normalizeQuestion(lines.join(" "));
  if (!question) {
    return undefined;
  }

  return {
    id: `open-question-${index + 1}`,
    question,
  };
}

function parseResolvedDecisionBlock(lines: string[], index: number): ResolvedDecisionEntry | undefined {
  const normalizedLines = lines.map((line) => line.trim()).filter(Boolean);
  if (normalizedLines.length === 0) {
    return undefined;
  }

  let question: string | undefined;
  const answerLines: string[] = [];
  let collectingAnswer = false;

  for (const line of normalizedLines) {
    const questionMatch = line.match(/^Question:\s*(.*)$/i);
    if (questionMatch) {
      question = normalizeQuestion(questionMatch[1] ?? "");
      continue;
    }

    const decisionMatch = line.match(/^Decision:\s*(.*)$/i);
    if (decisionMatch) {
      answerLines.push(decisionMatch[1]!.trim());
      collectingAnswer = true;
      continue;
    }

    const answerMatch = line.match(/^Answer:\s*(.*)$/i);
    if (answerMatch) {
      const initialAnswer = answerMatch[1]!.trim();
      if (initialAnswer) {
        answerLines.push(initialAnswer);
      }
      collectingAnswer = true;
      continue;
    }

    if (collectingAnswer) {
      answerLines.push(line);
      continue;
    }

    answerLines.push(line);
  }

  const answer = answerLines.join("\n").trim();
  if (!answer) {
    return undefined;
  }

  return {
    id: `resolved-decision-${index + 1}`,
    question,
    answer,
  };
}

function renderOpenQuestions(items: SpecOpenQuestion[]): string[] {
  return items.map((item) => `- ${item.question}`);
}

function renderResolvedDecisions(items: ResolvedDecisionEntry[]): string[] {
  const lines: string[] = [];

  for (const [index, item] of items.entries()) {
    if (index > 0) {
      lines.push("");
    }

    if (item.question) {
      lines.push(`- Question: ${item.question}`);
    } else {
      lines.push("- Decision:");
    }

    const answerLines = item.answer
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (answerLines.length === 0) {
      lines.push("  Answer:");
      continue;
    }

    lines.push("  Answer:");
    for (const line of answerLines) {
      lines.push(`    ${line}`);
    }
  }

  return lines;
}

function renderMarkdownSections(result: SplitMarkdownSectionsResult): string {
  const chunks: string[] = [];
  const trimmedPreamble = result.preamble.join("\n").trim();

  if (trimmedPreamble) {
    chunks.push(trimmedPreamble);
  }

  for (const section of result.sections) {
    const content = section.lines.join("\n").trimEnd();
    const sectionLines = [`${"#".repeat(section.depth)} ${section.heading}`];
    if (content.length > 0) {
      sectionLines.push("", content);
    }
    chunks.push(sectionLines.join("\n"));
  }

  return `${chunks.join("\n\n").trim()}\n`;
}

export function splitMarkdownSections(body: string): SplitMarkdownSectionsResult {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const preamble: string[] = [];
  const sections: MarkdownSection[] = [];
  let currentSection: MarkdownSection | undefined;

  for (const line of lines) {
    const match = line.trim().match(/^(#{1,6})\s+(.*)$/);
    if (match) {
      currentSection = {
        heading: match[2]!.trim(),
        depth: match[1]!.length,
        lines: [],
      };
      sections.push(currentSection);
      continue;
    }

    if (currentSection) {
      currentSection.lines.push(line);
    } else {
      preamble.push(line);
    }
  }

  return {
    preamble,
    sections,
  };
}

export function parseSpecQuestionSections(body: string): ParsedSpecQuestionSections {
  const { sections } = splitMarkdownSections(body);
  const openQuestionsSection = sections.find((section) => normalizeHeading(section.heading) === "open questions");
  const resolvedDecisionsSection = sections.find((section) => normalizeHeading(section.heading) === "resolved decisions");

  const openQuestions = openQuestionsSection
    ? splitSectionItems(openQuestionsSection.lines)
        .map((lines, index) => parseQuestionBlock(lines, index))
        .filter((item): item is SpecOpenQuestion => Boolean(item))
    : [];

  const resolvedDecisions = resolvedDecisionsSection
    ? splitSectionItems(resolvedDecisionsSection.lines)
        .map((lines, index) => parseResolvedDecisionBlock(lines, index))
        .filter((item): item is ResolvedDecisionEntry => Boolean(item))
    : [];

  return {
    openQuestions,
    resolvedDecisions,
  };
}

export function applySpecAnswers(body: string, answers: SpecAnswerInput[]): AppliedSpecAnswers {
  const filteredAnswers = normalizeSpecAnswers(answers);

  const split = splitMarkdownSections(body);
  const openQuestionsIndex = split.sections.findIndex((section) => normalizeHeading(section.heading) === "open questions");
  if (openQuestionsIndex === -1) {
    throw new SpecQuestionWriteError("conflict", "This spec does not have an Open Questions section.", "question");
  }

  const resolvedDecisionsIndex = split.sections.findIndex((section) => normalizeHeading(section.heading) === "resolved decisions");
  const existing = parseSpecQuestionSections(body);
  const answerByQuestion = new Map(filteredAnswers.map((answer) => [answer.question, answer.answer]));
  const openQuestionSet = new Set(existing.openQuestions.map((entry) => entry.question));

  for (const question of answerByQuestion.keys()) {
    if (!openQuestionSet.has(question)) {
      throw new SpecQuestionWriteError("conflict", `Open question not found in spec: ${question}`, "question");
    }
  }

  const answeredQuestions = existing.openQuestions
    .map((entry) => entry.question)
    .filter((question) => answerByQuestion.has(question));
  const remainingQuestions = existing.openQuestions.filter((entry) => !answerByQuestion.has(entry.question));
  const nextResolvedDecisions = [
    ...existing.resolvedDecisions,
    ...answeredQuestions.map((question, index) => ({
      id: `resolved-decision-new-${index + 1}`,
      question,
      answer: answerByQuestion.get(question) ?? "",
    })),
  ];

  if (remainingQuestions.length > 0) {
    split.sections[openQuestionsIndex] = {
      ...split.sections[openQuestionsIndex]!,
      lines: renderOpenQuestions(remainingQuestions),
    };
  } else {
    split.sections.splice(openQuestionsIndex, 1);
  }

  const resolvedSection: MarkdownSection = {
    heading: "Resolved Decisions",
    depth: 2,
    lines: renderResolvedDecisions(nextResolvedDecisions),
  };

  if (resolvedDecisionsIndex >= 0) {
    const adjustedIndex = remainingQuestions.length === 0 && resolvedDecisionsIndex > openQuestionsIndex ? resolvedDecisionsIndex - 1 : resolvedDecisionsIndex;
    split.sections[adjustedIndex] = resolvedSection;
  } else if (openQuestionsIndex >= 0 && remainingQuestions.length > 0) {
    split.sections.splice(openQuestionsIndex, 0, resolvedSection);
  } else {
    split.sections.push(resolvedSection);
  }

  return {
    body: renderMarkdownSections(split),
    answeredQuestions,
    remainingQuestions,
    resolvedDecisions: nextResolvedDecisions,
  };
}
