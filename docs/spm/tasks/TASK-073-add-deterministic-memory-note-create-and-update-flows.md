+++
doc_kind = "task"
id = "TASK-073"
title = "Add deterministic memory note create and update flows"
summary = "Support first-class CLI creation and deterministic metadata updates for scoped memory-note documents, with session-first capture and org-scope policy enforcement."
status = "review"
spec_ids = ["SPEC-020"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-26T00:17:45.224Z"
tags = ["memory", "notes", "cli"]
updated_at = "2026-04-26T00:25:29.314Z"
+++

# Scope

- Add repository helpers that create and update `memory-note` documents with deterministic IDs, filenames, and timestamps.
- Add a nested `spm memory note create` / `spm memory note update` command surface under the existing memory command family.
- Enforce scope enabled/write-policy rules for both session and org scopes, with session-first capture working under the default config.
- Keep the first implementation limited to create and replace-style update flows for title, summary, tags, expiry, and body.

# Done Looks Like

- Session notes can be created and updated without hand-editing `.specpm/memory/...` files.
- Org-scope writes fail clearly when the configured policy is read-only.
- Tests cover CLI and repository behavior for create, update, and policy rejection.
- The linked project memory stays consistent.
