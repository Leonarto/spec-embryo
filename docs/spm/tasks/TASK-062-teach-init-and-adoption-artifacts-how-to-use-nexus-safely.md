+++
doc_kind = "task"
id = "TASK-062"
title = "Teach init and adoption artifacts how to use Nexus safely"
summary = "Seed install and usage guidance for Nexus in init outputs, AGENTS-oriented artifacts, and templates without letting it replace spm or own the repo."
status = "done"
spec_ids = ["SPEC-017"]
depends_on = ["TASK-061"]
blocked_by = []
priority = 1
created_at = "2026-04-10T18:04:12.913Z"
completed_at = "2026-04-10T18:12:48.022Z"
tags = ["nexus", "adoption", "agents"]
updated_at = "2026-04-10T18:12:48.022Z"
+++

# Scope

- Add Nexus installation, verification, and safe-usage guidance to adoption artifacts and direct agent briefs.
- Explain the responsibility split between `spm` and Nexus.
- Add wording that keeps root AGENTS ownership with `spm` while allowing scoped Nexus use.
- Cover the safe verification loop: install separately, enable in config, update AGENTS guidance, re-run doctor.

# Done Looks Like

- Init-generated guidance teaches another human or agent how to use Nexus without making it mandatory.
- The direct agent brief warns against letting Nexus replace project-memory workflows.
- Regression tests protect the new wording.
