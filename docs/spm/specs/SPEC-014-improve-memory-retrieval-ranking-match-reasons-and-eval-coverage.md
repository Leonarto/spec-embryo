+++
doc_kind = "spec"
id = "SPEC-014"
title = "Improve memory retrieval ranking, match reasons, and eval coverage"
summary = "Strengthen deterministic retrieval by surfacing why matches were found, improving conceptual ranking, and adding agent-style regression scenarios."
status = "done"
task_ids = ["TASK-051", "TASK-052", "TASK-053"]
tags = ["memory", "retrieval", "evals", "ranking"]
owner = "human-ai"
updated_at = "2026-04-08T18:03:01.964Z"
+++

# Problem

The first deterministic memory commands are already useful, but agent-style exploration still exposes three gaps:

- text search can over-rank tasks when a parent spec is the better conceptual anchor
- query and brief outputs do not explain why a result matched
- there is no reusable agentic regression suite that pressure-tests retrieval from realistic continuation questions

That means the memory layer is functional but still leaves too much interpretation to the next agent.

# Goals

- Improve retrieval ranking so strong conceptual anchors, especially specs, surface earlier when they better represent the topic.
- Surface deterministic match reasons in memory query and memory brief outputs.
- Add a small agent-style retrieval eval suite so future ranking changes are easier to validate.
- Keep the retrieval layer deterministic and file-backed.

# Non-Goals

- Do not add semantic search, embeddings, or vector databases.
- Do not add bookmarks or saved searches in this slice.
- Do not redesign the UI yet; this slice is about retrieval quality and evals.

# Constraints

- Ranking changes must remain deterministic and explainable.
- Match reasons must be stable enough for both humans and JSON consumers.
- The eval suite should read like realistic agent questions, not only narrow unit-level assertions.

# Proposed Approach

- Add ranking heuristics that can reward stronger conceptual anchors without hiding exact matches.
- Enrich query and brief bundles with explicit `matchReasons` / `matchSummary` style fields.
- Add a small deterministic eval suite over the self-hosted repo that checks expected retrieval behavior for topics like adoption and the memory command family.

# Acceptance Criteria

- Topic queries can prefer a parent spec when it is the stronger conceptual summary of the work.
- Memory query results expose explicit match reasons in human and JSON output.
- Memory briefs expose why the center or match set was selected.
- The repo has a reusable retrieval eval suite covering realistic agent questions.

# Resolved Decisions

- Question: Should this slice stay deterministic instead of adding semantic search?
  Answer:
    Yes. Ranking and match reasons should stay deterministic and explainable in v1.

- Question: Should the evals look like realistic agent questions instead of only field-level assertions?
  Answer:
    Yes. The new coverage should pressure-test retrieval in the way another agent would actually use it.
