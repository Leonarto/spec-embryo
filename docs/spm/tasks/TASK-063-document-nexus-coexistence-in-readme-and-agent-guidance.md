+++
doc_kind = "task"
id = "TASK-063"
title = "Document Nexus coexistence in README and agent guidance"
summary = "Explain how spm and Nexus coexist so future humans and agents know when to use each and how to prevent AGENTS takeover."
status = "done"
spec_ids = ["SPEC-017"]
depends_on = ["TASK-062"]
blocked_by = []
priority = 2
created_at = "2026-04-10T18:04:12.971Z"
completed_at = "2026-04-10T18:12:48.101Z"
tags = ["nexus", "docs", "agents"]
updated_at = "2026-04-10T18:12:48.101Z"
+++

# Scope

- Update README and relevant AGENTS files so self-hosting and adopted repos understand the `spm`/Nexus split.
- Keep the guidance concise enough for AGENTS budget checks.
- Use the repo-local AGENTS maintenance workflow after the changes land.

# Done Looks Like

- README and local AGENTS guidance explain when to use `spm` and when to use Nexus.
- The AGENTS checker still passes after the wording changes.
