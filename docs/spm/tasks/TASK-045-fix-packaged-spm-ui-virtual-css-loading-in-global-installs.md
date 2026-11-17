+++
doc_kind = "task"
id = "TASK-045"
title = "Fix packaged spm ui virtual CSS loading in global installs"
summary = "Prevent vite-plugin-svelte from prebundling the packaged app like a dependency library so globally installed spm ui can load virtual CSS modules correctly."
status = "done"
spec_ids = ["SPEC-010"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
created_at = "2026-04-08T12:34:54.796Z"
completed_at = "2026-04-08T12:35:28.839Z"
tags = ["adoption"]
updated_at = "2026-04-08T12:35:28.839Z"
+++

# Scope

- Detect when the SvelteKit app is running from a packaged install under `node_modules`.
- Disable Svelte-library dev prebundling for that packaged case so app source is not treated like a dependency library and its virtual CSS modules still load.
- Keep local repo development behavior unchanged.
- Add focused regression coverage for the packaged-install detection and Svelte plugin options.

# Done Looks Like

- Packaged `spm ui` no longer relies on the failing virtual CSS loading path from globally installed app sources.
- Local repo dev keeps the existing behavior.
- The expected behavior is implemented and verified, and the linked project memory stays consistent.
