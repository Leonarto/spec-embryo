+++
doc_kind = "task"
id = "TASK-087"
title = "Add typed next-inspect entries to context-pack bundles"
summary = "Expose a typed next-inspect trail in context-pack bundles while preserving the legacy flat nextInspectIds list."
status = "done"
spec_ids = ["SPEC-033"]
depends_on = []
blocked_by = []
priority = 2
owner_role = "builder"
created_at = "2026-04-26T05:25:00.000Z"
completed_at = "2026-04-26T18:09:32.433Z"
tags = ["context", "resume", "prompt", "ux"]
updated_at = "2026-04-26T18:09:32.433Z"
+++

# Scope

- Add a typed next-inspect structure to context-pack bundles.
- Keep nextInspectIds as a compatibility field derived from the typed entries.
- Distinguish managed-document refs from changed-file paths in resume packs.
- Add focused regressions for memory-pack and resume-pack typed next-inspect behavior.

# Done Looks Like

- Context-pack bundles expose typed next-inspect entries.
- Legacy nextInspectIds still work and stay aligned.
- Resume packs mark promoted changed-file refs as change-path entries.
- The linked project memory stays consistent.
