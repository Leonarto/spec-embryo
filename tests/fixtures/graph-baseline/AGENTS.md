# AGENTS

Pinned test-only graph oracle from the commit in provenance.json.

- `*.source` preserve committed bytes; executable copies change import paths only. Verify both before differential tests.
- Never optimize or update expected legacy behavior to match production changes. Graph fixtures and comparison tests live outside this frozen baseline.
