+++
doc_kind = "task"
id = "TASK-041"
title = "Track external repo tool version and upgrade guidance"
summary = "Record the actual installed Spec Embryo version in adopted repos and make doctor surface when a newer CLI version is available."
status = "done"
spec_ids = ["SPEC-010"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-07T19:31:43.255Z"
completed_at = "2026-04-07T19:34:21.432Z"
tags = ["adoption", "versioning", "doctor"]
updated_at = "2026-04-07T19:34:21.432Z"
+++

# Scope

- Replace the hardcoded `tool_version` seed value with the actual installed Spec Embryo CLI version during `spm init`.
- Make doctor compare the adopted repo's recorded `tool_version` with the running CLI version.
- Surface when a newer Spec Embryo version is available so the human knows the repo may benefit from newer adoption guidance or defaults.
- Keep the version signal deterministic and file-backed rather than requiring a remote registry check from inside the adopted repo.

# Done Looks Like

- Newly adopted repos record the actual installed Spec Embryo version in `.specpm/config.toml`.
- `spm doctor` can tell when the running CLI version is newer than the repo's recorded tool version.
- The report explains why that matters and when rerunning adoption-oriented flows may be useful.
- The linked project memory stays consistent.
