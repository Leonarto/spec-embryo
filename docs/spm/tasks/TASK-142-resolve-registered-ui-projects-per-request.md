+++
doc_kind = "task"
id = "TASK-142"
title = "Resolve registered UI projects per request"
summary = "Harden shared portfolio registration and add request-scoped roots, identity guards and loopback registration actions."
status = "in_progress"
spec_ids = ["SPEC-063"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "implementation"
created_at = "2026-11-17T14:23:07.919Z"
tags = []
updated_at = "2026-11-17T14:23:58.422Z"
+++

# Scope

Backend slice in the approved SPEC063 contract. Terra6.1High owns shared registry, request root and expected-identity enforcement, registration actions and tests. Root maintains managed docs/guides. Independently review source/tests before commit; no real user registry writes. Isolation fixture tests cover collisions, atomic concurrent updates, invalid selections, remapped roots, question writes and loopback policy.
