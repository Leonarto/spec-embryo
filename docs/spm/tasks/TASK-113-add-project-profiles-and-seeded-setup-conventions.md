+++
doc_kind = "task"
id = "TASK-113"
title = "Add project profiles and seeded setup conventions"
summary = "Introduce deterministic project profiles that seed defaults, tags, and bounded guidance for common repository types."
status = "todo"
spec_ids = ["SPEC-056"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-05-20T22:18:00Z"
tags = []
updated_at = "2026-05-20T22:18:00Z"
+++

# Scope

- Add a bounded set of deterministic project profiles.
- Let init or setup flows seed defaults and starter guidance from a profile.
- Keep profiles overrideable per repo.
- Add tests for profile selection and generated outputs.

# Done Looks Like

- Repeated repo setup becomes more consistent and less manual.
- Profiles seed useful defaults without taking over repo-local decisions.
- Existing adoption flows remain compatible.
- Tests cover profile-driven initialization behavior.
