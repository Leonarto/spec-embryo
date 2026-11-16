# AGENTS

- Controller owns URL/history/focus; preserve host/content DOM across modes. Only modal owns inert/trap.
- List keys exclude inspect/section/rel.*; history proof is memory-only. Preserve PageState. Traversal defaults to page; Timeline may register expanded logical IDs.
- V2 snapshots swap atomically. Relations require intent/entity/epoch/revision; failures retain ranges.
- relation-url.ts awaits public navigation completion, guards queued snapshot/key intent and updates current URL/ledger.
- Questions remain a canonical link until their guarded slice; no second mutation endpoint.
