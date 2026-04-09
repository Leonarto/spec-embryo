# Spec Format

Spec Embryo expects specs and tasks as Markdown files with TOML frontmatter so they stay readable while remaining deterministic to parse.

## Spec files

Location:

- `docs/spm/specs/*.md` or `<configured-memory-home>/specs/*.md`

Required shape:

```md
+++
doc_kind = "spec"
id = "SPEC-001"
title = "Short spec title"
status = "active"
summary = "One-line summary"
task_ids = ["TASK-001", "TASK-002"]
tags = ["foundation"]
owner = "human-ai"
updated_at = "2026-04-02T00:00:00Z"
+++

# Problem

...

# Goals

...

# Non-Goals

...
```

Section conventions that now have first-class product support:

- `## Open Questions` can hold bullet or paragraph questions that still need answers.
- `## Resolved Decisions` can hold durable answers after those questions are resolved.
- The UI answer flow rewrites those two sections deterministically instead of rewriting the whole spec with an LLM.

Resolved decision format used by the UI:

```md
## Resolved Decisions

- Question: Should follow-up tasks be created immediately?
  Answer:
    Not automatically. The system should suggest them first.
```

## Task files

Location:

- `docs/spm/tasks/*.md` or `<configured-memory-home>/tasks/*.md`

Required shape:

```md
+++
doc_kind = "task"
id = "TASK-001"
title = "Short task title"
status = "todo"
summary = "One-line summary"
spec_ids = ["SPEC-001"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-03T00:00:00Z"
completed_at = "2026-04-03T01:00:00Z" # optional
cancelled_at = "2026-04-03T01:00:00Z" # optional
archived_at = "2026-04-10T01:00:00Z" # optional
archive_reason = "Aged out of the active board" # optional
tags = ["cli"]
updated_at = "2026-04-02T00:00:00Z"
+++

# Scope

...

# Done Looks Like

...
```

Task lifecycle in this repo:

- `todo`
- `in_progress`
- `blocked`
- `review`
- `done`
- `cancelled`

`review` is the explicit pre-completion stage. Work should generally move through review before being marked `done`.

## Tag guidance

Tags are soft-normalized retrieval handles.

- Use tags to support `spm memory query` and `spm memory brief`, especially for cross-spec topics that are not captured by status alone.
- Prefer short, stable topical tags such as `adoption`, `ui`, `timeline`, or domain tags like `combat`.
- Preserve meaningful legacy topical labels as tags during migration when they help another human or agent find related work later.
- Memory tag filters normalize spaces, underscores, and hyphens to the same canonical tag, so `dark mode`, `dark_mode`, and `dark-mode` match the same docs.
- Memory tag filters do not treat partial substrings as matches; query `dark` only if `dark` is the actual tag.
- Avoid unnecessary synonym drift like `frontend` vs `ui` unless the repo intentionally distinguishes them.
- Do not use tags as a substitute for canonical statuses, explicit `spec_ids`, `task_ids`, `depends_on`, or `blocked_by` links.
- In v1, tags are not a hard-enforced global taxonomy; they are a soft retrieval aid, so consistency matters more than exhaustiveness.

Completion rule:

- If review finds issues, the task should remain in `review` or move back into active work.
- A task should move to `done` only after the review findings are addressed.

Lifecycle timestamps:

- `created_at` is the task creation timestamp.
- `completed_at` is the most recent time the task entered `done`.
- `cancelled_at` is the most recent time the task entered `cancelled`.
- `archived_at` and `archive_reason` are optional archival metadata used by later Kanban hygiene and historical views.
- `updated_at` remains a generic document edit timestamp and should not be used as a substitute for lifecycle events.

## Migration command

When a project already has a docs or specs folder in another format, use:

```bash
bun run spm spec import-prompt --source path/to/existing/specs --instructions "Preserve goals and split execution into tasks"
```

This command does not mutate files. It deterministically scans the source folder and returns an agent-ready migration bundle with:

- scanned file inventory
- excerpts
- required frontmatter fields
- migration rules
- a recommended prompt

Use that bundle with an agent to rewrite the source material into the configured managed `specs/` and `tasks/` folders in the format this CLI reads.

## Creation commands

You can also create new managed docs directly:

```bash
bun run spm spec create \
  --title "Prompt-return backend orchestration" \
  --summary "Define how prompt-return and subprocess backends should coexist." \
  --status proposed \
  --tags backends,agents

bun run spm task create \
  --title "Implement prompt backend adapter" \
  --summary "Return structured prompt bundles instead of spawning nested agents." \
  --spec-ids SPEC-001 \
  --depends-on TASK-002 \
  --priority 2 \
  --tags backends,prompt
```

Deterministic creation rules:

- spec IDs are assigned as `SPEC-###` from the next available number
- task IDs are assigned as `TASK-###` from the next available number
- filenames are derived from the generated ID plus a slugified title
- linked IDs are validated before writing
- when a task is created, its linked specs are updated with the new `task_ids`
- when a spec is created with linked tasks, those task docs are updated with the new `spec_ids`

Archival commands:

```bash
bun run spm task archive TASK-014 --reason "Aged out of the active board"
bun run spm task archive-done --older-than 7d --reason "Weekly cleanup"
bun run spm task archive-cancelled --older-than 14d
bun run spm task restore TASK-014
```

Archiving does not change `status`; it adds archival metadata so active-flow views can hide old closed work by default without losing durable history.

Analytical views such as Specs and Gantt can then filter deterministically by one or more `spec_ids` and by lifecycle windows like `7d`, `30d`, or `90d`. Those slices use `completed_at` and `cancelled_at` instead of `updated_at`, and they can include archived tasks when the point is to inspect the full work history of a spec set.

## Spec question answers from the UI

Spec detail pages can answer open questions in batch and save them back into the source file. The save flow:

- removes answered entries from `## Open Questions`
- appends them into `## Resolved Decisions`
- preserves the rest of the spec body deterministically
- returns continuation guidance plus an agent-facing evaluation prompt bundle

This keeps the file-backed source of truth durable for future humans and agents instead of leaving important decisions stranded in chat history.
