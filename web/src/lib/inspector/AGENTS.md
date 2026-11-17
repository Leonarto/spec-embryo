# AGENTS

- Controller owns URL/history/focus; docking preserves content. Only modal owns inert/trap. QuestionLeaveDialog guards leave; owned history restores before prompting.
- List keys exclude inspect/section/rel.*. History proof is memory-only; preserve PageState. Navigation defaults to page; Timeline registers expanded IDs.
- V2 snapshots swap atomically. Relations require intent/entity/epoch/revision; errors retain ranges. Outcome invalidation retains snapshot/URL but rejects pre-write work.
- spec-outcome-fence stores browser-document identity generations only. Initial/reactive adapters reject fenced props; controlled reads coalesce, with no seed fallback.
- relation-url awaits public navigation completion and updates only current owned keys.
