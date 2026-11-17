+++
doc_kind = "spec"
id = "SPEC-020"
title = "Add first-class memory note capture and management flows"
summary = "Let humans and agents create and manage scoped memory notes through deterministic CLI commands instead of editing files by hand."
status = "done"
task_ids = ["TASK-073", "TASK-074"]
tags = ["memory", "notes", "cli"]
owner = "human-ai"
updated_at = "2026-04-26T00:46:22.987Z"
+++

# Problem

Spec Embryo now has scoped memory retrieval, context packs, consolidation, and evals, but there is still no first-class way to create or manage `memory-note` documents through the CLI. In practice that means the session and org memory scopes are only fully usable by people who are willing to hand-author Markdown files in `.specpm/memory/...`.

That gap weakens the whole scoped-memory model:

- quick session capture is harder than it should be
- agents cannot rely on a deterministic write path for note capture
- org-scope policy is implicit in config but not enforced through a user-facing workflow
- later note-management work has no stable command surface to build on

The next slice should make memory-note capture a real product capability instead of a hidden file format.

# Goals

- Add deterministic CLI flows to create and update scoped `memory-note` documents.
- Make session-scope capture easy enough that humans and agents stop needing raw file edits for normal note creation.
- Enforce scope write policy explicitly so org-scope notes respect read-only or read-write config at the command layer and repository layer.
- Keep note creation and updates file-backed, reviewable, and compatible with the existing retrieval, pack, consolidation, and eval services.
- Establish a stable note-management command surface that follow-up tasks can extend with archive and inspection workflows.

# Non-Goals

- Do not add a second hidden note database or any non-file-backed storage.
- Do not collapse session notes directly into durable repo truth; consolidation remains the explicit promotion path.
- Do not implement note archive/list workflows in this first task; those belong to `TASK-074`.
- Do not add web-only note editing flows in this spec.

## Constraints

- Deterministic file-backed behavior remains the default.
- Memory-note IDs should be stable, scope-aware, and allocated through the same serialized repository lock discipline used for spec and task creation.
- Session-scope capture should work out of the box with the existing default config.
- Org-scope note writes must fail cleanly when the configured policy is `read-only`.
- The command surface should fit naturally under `spm memory ...` rather than inventing a separate top-level note subsystem.

## Proposed Approach

Add a nested `spm memory note` command surface with a small first slice:

1. `spm memory note create`
   - create a `memory-note` in `session` or `org` scope
   - accept deterministic metadata such as title, summary, tags, optional expiry, and body
   - allocate a scope-aware note id and filename through the repository lock
2. `spm memory note update`
   - update title, summary, tags, expiry, and body deterministically for an existing note
   - preserve file-backed readability rather than storing partial patches elsewhere
3. Repository enforcement
   - centralize scope enabled/write-policy checks in repository helpers
   - make update flows reject writes to read-only scopes even if a caller bypasses the command layer

This first slice is intentionally session-first in practical usage, but it should not hardcode session-only logic. Org notes remain supported when project policy explicitly allows writes.

## Detailed Specification

### Command shape

- `spm memory note create --scope session|org --title "..." [--summary "..."] [--tags a,b] [--expires-at <ISO-8601>] [--body "..."] [--json]`
- `spm memory note update <NOTE-ID> [--title "..."] [--summary "..."] [--tags a,b] [--expires-at <ISO-8601> | --clear-expires-at] [--body "..."] [--json]`

### Create behavior

- Scope is required and must be either `session` or `org`.
- Title is required.
- Summary defaults to a deterministic placeholder only if omitted intentionally by the command layer; otherwise it should use the provided value.
- Tags are stored as a deterministic list after trimming empties.
- Body is optional and should default to a small readable template or empty note body rather than hidden metadata.
- `created_at` and `updated_at` should both be set at creation time.
- The created note should reflect the configured scope write policy in the returned document model.

### Update behavior

- Update requires an existing note ID.
- At least one mutable field must be provided; otherwise the command should reject the request.
- `--tags` replaces the tag list deterministically for this slice.
- `--clear-expires-at` removes any existing expiry.
- `--body` replaces the note body deterministically for this slice.
- Title updates rewrite the existing file in place; they do not rename the underlying markdown path in this first slice.
- `created_at`, consolidation metadata, and archive metadata should be preserved unless a later dedicated workflow changes them.

### Scope policy behavior

- Creating or updating a note in a disabled scope should fail clearly.
- Creating or updating a note in a `read-only` scope should fail clearly.
- Session scope should keep working with the existing default `read-write` policy.

### ID and file layout behavior

- Note IDs should be deterministic and scope-aware, following a stable convention such as `NOTE-SESSION-###` and `NOTE-ORG-###`.
- Filenames should include the generated ID plus a slug from the title.
- ID allocation must remain serialized through the shared repository lock.

## Edge Cases

- A repo may disable org scope entirely.
- A repo may enable org scope but keep it read-only, so create/update commands must reject writes without corrupting the file tree.
- A user may create a note with no expiry and later clear or add one.
- A note title may slugify to an empty string, so filename fallback is required.
- A caller may attempt an update with no actual field changes; the command should reject that instead of performing a no-op rewrite.

## Acceptance Criteria

- Humans and agents can create session memory notes through a first-class `spm memory note create` command.
- Existing notes can be updated deterministically through `spm memory note update`.
- Scope-enabled and write-policy checks are enforced in reusable repository logic, not only in the command handler.
- New note IDs and filenames are deterministic and serialized safely.
- Regression tests cover happy-path create/update plus read-only org-scope rejection.

## Open Questions

- Should a later slice add append-style body updates for quick capture, or keep replacement-only body writes as the deterministic default?
