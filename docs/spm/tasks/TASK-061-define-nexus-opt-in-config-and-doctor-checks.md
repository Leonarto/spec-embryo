+++
doc_kind = "task"
id = "TASK-061"
title = "Define Nexus opt-in config and doctor checks"
summary = "Add project config and doctor validation so repos can explicitly enable Nexus while keeping it external and bounded."
status = "done"
spec_ids = ["SPEC-017"]
depends_on = []
blocked_by = []
priority = 1
created_at = "2026-04-10T18:04:12.893Z"
completed_at = "2026-04-10T18:12:48.022Z"
tags = ["nexus", "doctor", "config"]
updated_at = "2026-04-10T18:12:48.022Z"
+++

# Scope

- Extend project config parsing and default config templates with an optional disabled-by-default Nexus section.
- Add deterministic doctor checks for Nexus-enabled repos, including command availability and bounded coexistence wording.
- Keep the checks local and explicit; do not call Nexus or require a network install.
- Add regression tests for config parsing and doctor findings.

# Done Looks Like

- Repos can opt in to Nexus through config without changing normal `spm` behavior.
- Doctor can explain what is misconfigured when Nexus is enabled unsafely or incompletely.
- Tests lock the new config and doctor behavior.
