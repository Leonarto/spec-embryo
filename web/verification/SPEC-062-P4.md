# SPEC-062 P4 — persistent read-only inspector

TASK-128 review freeze. Canonical question mutation remains unchanged; editing inside the inspector is deferred to TASK-129. Root owns managed-memory status/commits.

One layout controller/host reconstructs direct inspect URLs and loads only selected detail code/data. The same div changes complementary/dialog semantics without remounting the reader or Mermaid subtree. Inspector-only navigation preserves list data, selection, filter drafts and scroll; session-ledger proof controls Back versus current-URL replacement. The actual-address adapter handles installed Kit shallow routing, whose page.url remains stale.

## Evidence

-128 browser checks pass across history18, responsive19, transport12, modules4, SSR/no-JS13, consumed-SSR-seed regression3, fanout9, themes40, Mermaid fallback6 and target sizing4. Raw `task128-*-report.json` files identify Chromium157.0.8103.78, method and scope.
-38 independent production-snapshot HTTP/SSR/import-closure checks pass (`task128-http-report.{json,md}`), attributed to its exact171-source-hash checkpoint. Later presenter/RelationWindow/Mermaid/controller corrections are outside that snapshot; final build/browser evidence covers current integration.
-Full Bun suite:356pass/0fail,7244expects,59files;91.61%functions/92.58%lines. Bun coverage excludes Svelte/browser execution. Svelte check0errors/0warnings; AGENTS and whitespace checks pass. Production build passed. After the final Board-only correction, Svelte check again passed0errors/0warnings and the production build passed (5.53s); whitespace check passed. The approved356-test coverage run was retained without repeating the suite for this Svelte-only delta.
-Astra approved the19-file core independently after F128-core-1; its partial approval does not certify the complete slice. `task128-core-manifest.json` records those immutable hashes.

Browser gates include direct SSR without duplicate fetch; actual-address URL/history/copy links; no list/router fetch on inspector-only changes; page/filter/sort preservation; unowned reload close; independent Timeline trace; desktop F6/no trap, mobile trap/inert cleanup, popup→Filters→inspector Escape, and a separately labeled descendant-consumed-event modal harness. Delayed DTO/code, local404/500/timeout, Retry, moved focus and stale SSR close/reopen are covered. Real no-JS navigation retains native tables, inline detail, canonical questions and ordinary400 empty-answer feedback.

Task/Spec canonical and inspector surfaces were checked in light/dark at1440×900 and390×844, asserting actual resolved theme/colors. Scoped text audits found zero failures/skipped solid backgrounds; eight desktop axe scans found zero violations. Axe records an incomplete aria-prohibited-attr node for SVG; SVG is excluded from the custom text audit. This is not a screen-reader/global accessibility certification. Four focused follow-ups verify24px canonical Back targets and44px touch breadcrumb/question links after target-only CSS corrections. Theme colors were unchanged.

## Bounded inspector and explicit follow-up

A real9999-dependent fixture mounts100 relation cards, reaches the final99 through replacement paging, retains pager focus, and exposes a canonical complete-collection link. Spec tasks share one100-item window across groups, preserving original metrics/order. Reader/page/focus/Mermaid identity survives mode changes and collection refresh clamps. SSR shows the first100 plus a real full-page link; canonical collections and DTO payloads remain complete pending mandatory TASK-138.

The serial HTTP diagnostic uses five warmups/twenty samples on the retained10k/2k fixture:9999-dependent detail3,496,604B, median409.56ms/p95505.88ms; zero-dependent detail1,824B, median381.06ms/p95494.51ms. These measure HTTP/download/JSON parse, not click-to-content or OS-cold p95. The300ms detail budget is **not met/certified** by this slice; TASK-138 owns bounded producers/canonical/no-JS and performance, before question integration. P7 retains final package/zoom/screen-reader/leak/long-task gates.

Mermaid SSR/no-JS exposes readable source with a JavaScript notice. Zoom controls exist only with usable SVG; loading/error retain source without dead controls. No new parser or mutation endpoint was introduced.

## Review corrections / lease

F128-core-1 prevents reuse of consumed/nonmatching SSR seeds through identity changes. Three dedicated browser regressions pass; initial SSR still avoids a duplicate fetch. F128-final-1 corrects the presence banner condition. Astra independently passed its three membership states. Four affected Task inspector captures were regenerated at1440/390 in actual light/dark palettes, with zero absence banners for a matching visible row. No core hashes changed.

F128-final-2 adds the Board view adapter for opener capture/restoration, nearest-surviving-card/toolbar fallback, F6 and its own scrollport. The enhanced Board fills the available list region and owns one X/Y card scrollport; SSR/no-JS retains natural height. Five focused checks pass: desktop deep X/Y + visible drawer + F6 + native Tab to last card; desktop Close after opener removal; modal Escape restoring the same card/scroll/query; modal Close after all cards disappear returning toolbar/clearing inert; and real no-JS natural-height/no-clipping. The empty-list refresh is a programmatic transport fixture while the background is inert, not a user activation claim. See task128-board-review-report.json. These checks supplement the128 earlier checks; no broad matrix was repeated.

Browser was closed for independent review; servers5184/5188 and synthetic230-task/12-spec fixture5292 remain available. Only disposable fixtures were written. Screenshots and reports are durable here; temporary tool snapshots stay under ignored `.playwright-mcp/`. Exact file hashes are in `task128-manifest.json`.
