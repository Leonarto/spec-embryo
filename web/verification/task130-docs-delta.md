# Proposed root-owned documentation delta

- README Timeline description: compact grouped relative-unit view, independent Trace/Inspect, bounded semantic simple table, diagnostics and adaptive/virtual rendering. Do not imply calendar scheduling or global performance completion.
- Architecture services: `workspace-timeline.ts` adapts the unchanged legacy projection once; `workspace-timeline-contract.ts` shares Timeline-only v2 safe-unit/diagnostic/page validation with the browser. Overview/Tasks/Specs remain v1. Request keys preserve syntactic page/trace intent before clamping.
- Architecture presentation: `components/timeline/` contains toolbar, ruler, group row, grid, semantic fallback, diagnostic disclosure and bounded related-spec trace pages. One scrollport; focused virtual occurrence remains mounted in logical order; restored openers materialize before focus. Collapse is in-memory route-session state; density uses versioned opaque-project storage.
- Services AGENTS compact pointer: Timeline adapter/contract own safe-unit v2 transport and bounded diagnostics/fallback/related-spec pages; legacy numeric graph APIs remain unchanged.
- Tests AGENTS compact pointer: Timeline tests compare finite output to legacy and cover iterative diagnostics, nonfinite/null validation, bounded SSR, virtual focus/geometry/ticks and query paging. Browser reports distinguish isolated production checkpoint from future combined138/129 integration.
- Lib AGENTS compact pointer: `components/timeline/` owns relative-unit presentation and logical-window focus; shared service derives graph/safe transport.

These are proposals for root's serial merge into shared guides. No shared documentation file was edited by the Timeline implementer.
