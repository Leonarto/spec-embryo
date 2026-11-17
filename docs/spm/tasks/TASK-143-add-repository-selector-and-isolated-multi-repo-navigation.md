+++
doc_kind = "task"
id = "TASK-143"
title = "Add repository selector and isolated multi-repo navigation"
summary = "Add registration and selector UI, preserve project identity in links forms and fetches, and guard cross-repo draft navigation."
status = "review"
spec_ids = ["SPEC-063"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-17T14:23:08.000Z"
tags = []
updated_at = "2026-11-17T14:38:37.728Z"
+++

# Scope

Client slice in the approved SPEC063 contract. Terra6.1High owns compact repo selector, registration form, all URL/form/fetch propagation, guarded full-document project changes and expected identity fields. Backend contract is fixed while slices proceed in parallel. Integrate and verify against the reviewed backend checkpoint before done. Tests cover two roots with identical IDs, native/enhanced forms, late reads and Save/Discard/Keep.

## Integration checkpoint

Exact reviewed28-file UI patch integrated against committed backendfb3728a. Svelte check passes0errors/0warnings. Combined focused service/resource tests pass17/136 and navigation tests2/10 (19tests146assertions across4files). The initial missing DTO/type issues were isolated integration preparation and are resolved. Browser isolation, native/enhanced and package verification remain in TASK144; no final latency claim.
