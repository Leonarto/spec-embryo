# AGENTS

- `model.ts` owns view-only flattening, ticks and viewport windows; domain placement/diagnostics stay in root workspace services.
- One scrollport aligns ruler/labels/bars. Virtual keys identify occurrences; pin focused rows, never recycle focus.
- Inspector IDs describe expanded logical rows, not mounts. Group openers restore their header link without expanding content; trace stays independent.
- SSR/simple use the producer's bounded fallback page. Null units have no ruler/bars; preserve finite text values.
