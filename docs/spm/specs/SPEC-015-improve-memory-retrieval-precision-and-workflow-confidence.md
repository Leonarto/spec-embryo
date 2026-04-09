+++
doc_kind = "spec"
id = "SPEC-015"
title = "Improve memory retrieval precision and workflow confidence"
summary = "Refine retrieval precision, tag semantics, and end-to-end workflow coverage so memory commands stay trustworthy as the repo grows."
status = "done"
task_ids = ["TASK-057", "TASK-058", "TASK-059"]
tags = ["memory", "retrieval", "precision", "testing"]
owner = "human-ai"
updated_at = "2026-04-09T02:21:25.757Z"
+++

# Problem

The memory commands are now useful enough for real agent work, but three trust gaps remain:

- body indexing is deterministic but still line-based and can over-index noisy fragments instead of meaningful section content
- tag filtering is permissive substring matching, which risks surprising results as the corpus grows and tag reuse becomes more important
- the current tests are strong at the service level but still light on end-to-end workflow scenarios that exercise `query`, `links`, and `brief` together

Those gaps do not break the feature, but they do reduce confidence that retrieval quality will stay stable as more repos adopt the system.

# Goals

- Make body-text retrieval more section-aware without giving up deterministic indexing.
- Tighten tag matching so tag filters feel predictable and stable for humans and agents.
- Add broader workflow-oriented regression coverage that validates how the memory commands work together.
- Keep the retrieval layer deterministic, local-first, and explainable.

# Non-Goals

- Do not add semantic search, embeddings, or a vector database.
- Do not add a new query language in this slice.
- Do not redesign the UI around these improvements yet.

# Constraints

- Retrieval behavior should stay explainable from repo files and explicit scoring/filter rules.
- Tag semantics should become stricter without silently breaking legitimate existing tag usage.
- Scenario coverage should be stable enough to run in CI and should not depend on network access.

# Proposed Approach

- Replace naive line-by-line body indexing with section-aware extraction that preserves meaningful headings and narrative while dropping low-signal noise.
- Define and document normalized tag-matching semantics for retrieval filters, then update tests around expected matches and non-matches.
- Add a higher-level memory workflow eval suite that exercises `spm memory query`, `spm memory links`, and `spm memory brief` against realistic multi-document scenarios.

# Acceptance Criteria

- Body-based retrieval can still find relevant concepts, but indexing is less noisy and easier to reason about.
- Tag filters behave predictably enough that a human can infer why a tagged result matched or did not match.
- The repo contains end-to-end memory workflow coverage beyond single-command unit tests.
- The new behavior is documented in the managed tasks for implementation.

# Resolved Decisions

- Question: Is this a new spec rather than just three disconnected tasks?
  Answer:
    Yes. These improvements all refine retrieval trustworthiness and should be tracked as one follow-up memory-quality slice.

- Question: Should this stay deterministic instead of moving toward fuzzy or semantic retrieval?
  Answer:
    Yes. The work should improve precision and confidence while preserving deterministic behavior.
