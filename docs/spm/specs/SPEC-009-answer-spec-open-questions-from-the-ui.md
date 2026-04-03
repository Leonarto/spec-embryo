+++
doc_kind = "spec"
id = "SPEC-009"
title = "Answer spec open questions from the UI"
summary = "Let humans and agents answer spec open questions in the UI, write those answers back into the spec files deterministically, and turn resolved decisions into better follow-up work such as new tasks or tighter spec details."
status = "done"
task_ids = ["TASK-024", "TASK-025", "TASK-026"]
tags = ["ui", "specs", "workflow", "mutations"]
owner = "human-ai"
updated_at = "2026-04-03T17:10:57.170Z"
+++

# Overview

Specs in this repo often end with real open questions, but the current UI only lets a user read them. Once a human answers those questions, the answer still has to be copied back into the file manually, and the rest of the spec workflow does not react to the new decision.

That creates a continuation gap:

- the answer is known, but the source-of-truth file is stale
- the spec still reads as unresolved even after a decision was made
- agents coming back later cannot reliably tell which questions are still open
- the newly decided scope does not naturally turn into follow-up work

This slice should let the UI capture answers to open questions and write them back into the spec deterministically, so the repo becomes easier for a later agent to continue from.

## Context

Spec Embryo already has:

- deterministic spec detail pages
- file-backed Markdown specs
- a required workflow of draft -> iterate with the human -> review -> fix
- deterministic CLI flows for creating and updating project-memory documents

What it does not yet have is a repo-native answer loop for open questions. Today, the user may answer a question in chat, but the spec file and downstream work graph do not update themselves.

This is important because open questions are often the handoff point between planning and implementation. Once answered, they should stop being hidden in conversation and start becoming durable project memory.

## Goals

- Let a human or agent answer a spec open question from the UI.
- Write the answer back into the spec file deterministically.
- Make the spec reflect that the question is now resolved rather than still open.
- Support follow-up continuation by surfacing what should happen next after an answer is recorded.
- Keep the underlying source of truth readable in Markdown and easy for a future agent to continue from.

## Non-Goals

- Do not add free-form WYSIWYG editing of full specs in this slice.
- Do not require an LLM to rewrite the spec every time a question is answered.
- Do not auto-create tasks silently without a visible user- or agent-review step.
- Do not try to solve every kind of document editing in the first UI mutation slice.

## Constraints

- File-backed Markdown remains the source of truth.
- Question answering should use deterministic file updates wherever possible.
- The mutation path must preserve readability for both humans and future agents.
- The UI flow should not assume a remote backend or database.
- If an answer implies broader spec restructuring, the system may suggest a next step rather than performing a risky rewrite automatically.

## Proposed Approach

- Treat spec open questions as a first-class structured concept in the spec detail view.
- Add a UI flow on a spec detail page where the user can:
  - review all current open questions
  - answer one or more of them in the same session
  - submit the answered batch back into the spec
- On save, the deterministic update should:
  - remove the answered questions from `## Open Questions`
  - append the answers into a `## Resolved Decisions` section, or create that section if it does not exist
  - preserve the rest of the document structure and body as much as possible
- After saving an answer, the UI should show continuation guidance such as:
  - review the updated spec
  - create one or more new tasks
  - revise a detailed section that is now underspecified or outdated
- Add an LLM-assisted evaluation step after save that inspects the updated spec and determines whether:
  - the spec is now sufficiently decided to continue
  - more detail should be added to the existing spec body
  - new open questions should be created
  - new tasks should be proposed

## Detailed Specification

- The detail service should parse `## Open Questions` and `## Resolved Decisions` sections explicitly rather than treating them as generic body text only.
- The UI should render open questions as individually answerable items, not just one undifferentiated paragraph block.
- The UI should allow answering multiple open questions before a single save action.
- Saving an answer should create a durable textual record in the spec file that includes:
  - the original question
  - an explicit `Answer:` line containing the chosen answer
  - enough wording that another future agent can understand the decision without reading chat history
- The resolved decision format should preserve the fact that the answer came from a human or agent interaction rather than being silently rewritten by the system.
- If a `## Resolved Decisions` section is absent, the system should create it in a consistent place near the bottom of the spec.
- If answering a question makes the spec materially clearer but still incomplete, the UI should suggest either:
  - create a task
  - revise the spec further
  - continue answering remaining questions
- After the deterministic file update, the system should be able to run an LLM evaluation pass that decides whether the current information is sufficient or whether new open questions should be created.
- The LLM evaluation should not silently mutate the spec. It should return structured recommendations that are then either:
  - shown to the user for confirmation
  - converted into explicit next-step UI actions

## Edge Cases

- A spec may list open questions as bullets instead of paragraphs.
- A spec may not yet have a `## Resolved Decisions` section.
- A user may answer only some of the questions and leave others unresolved.
- A user may answer many questions in one batch, but only some of those answers may be enough to close the planning gap.
- A question may need a long-form answer instead of a one-line resolution.
- A saved answer may reveal that the spec needs human revision rather than immediate task creation.
- Older specs may use slightly different heading names or orderings.
- The LLM evaluation may determine that one answer resolves a question but creates a new ambiguity elsewhere in the spec.

## Acceptance Criteria

- A spec detail page can render open questions as answerable UI items.
- Saving an answer updates the Markdown spec file deterministically.
- Answered questions no longer remain in the open-questions list.
- The saved answer becomes durable spec memory in a resolved-decisions area.
- The UI supports answering multiple questions before one save action.
- The UI gives explicit next-step guidance after answers are saved.
- The post-save evaluator can recommend either continuation, new tasks, or new open questions.
- Another future agent can inspect the file and understand what was decided without relying on chat history.

## Resolved Decisions

- Question: Should resolved decisions store answers as plain bullets, or as richer entries that include both `Question:` and `Decision:` text?
  Answer: Maintain the original question and add an explicit `Answer:` line so a future AI can tell this was user- or agent-provided resolution text.

- Question: Should the first version allow answering only one question at a time, or a small batch in one save flow?
  Answer: The UI should allow answering all visible open questions and then submitting them together in one save flow.

- Question: Should post-answer next steps remain advisory only, or should the UI also offer one-click creation of draft tasks immediately after saving?
  Answer: The LLM should evaluate whether the answered information is sufficient. If not, it should be able to propose new open questions. If it is sufficient, it can recommend follow-up work such as task creation or deeper detail refinement.
