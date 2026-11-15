# AGENTS

- Read-only generic table; columns provide text, rendering and server sort keys. Never fetch or derive domain state here.
- Grid enhancement starts after mount, with one roving target; simple/SSR output stays a native table.
- Focus uses row ID/column key; selection is page-local. Query changes clear selection; refresh reconciles IDs.
- Shared helpers own navigation, ranges, bounded preferences and safe TSV. Native links and selected-text copy remain intact.
