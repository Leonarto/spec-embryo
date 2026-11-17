# Review: Multi-repository local workspace design

**Status:** REVISE

## Assumptions

- The portfolio file and registered paths can change outside this server; a selected record may be removed, changed, or retargeted through a symlink while a page is open.
- A workspace key derived from the canonical real root is an opaque equality guard, not an authorization token or a client-selected path.

## Findings

### GAP-1: Stale requests can cross workspace roots
**Dimension:** Data isolation and mutation safety
**Severity:** RED
**Problem:** Each request freshly resolves the URL ID, but no request carries the real-root identity under which its client state was produced. An external registry edit or symlink change between page load and a spec-answer POST can make the same ID resolve to a different root. Likewise, background requests can replace old workspace data with data from a newly mapped root. This violates the stated stale-client and draft isolation guarantees even though each request has immutable locals.
**Impact:** An answer intended for one repository can be applied to another with the same spec ID and compatible revision; stale results can be displayed under the wrong workspace.
**Suggested fix:** Include the server-derived workspace key in rendered page data and every canonical answer form as an expected identity. Require it for registered selections; preserve legacy launch-root POSTs that omit it, and enforce it whenever supplied. Resolve the selection afresh, compare the expected key to the selected canonical-root key before mutation, and return a visible recoverable 409 conflict without losing the draft on mismatch. Include and check the same expected key on workspace background fetches, rejecting mismatches before serving a snapshot. Initial document GETs establish the key and do not need an expectation. The key never selects a path. Add tests that change a registry mapping or symlink between initial load and POST/fetch, including no-JavaScript form submission.

### GAP-2: The backend/UI contract is not specified sufficiently for parallel work
**Dimension:** Implementation consistency
**Severity:** RED
**Problem:** The design requires a documented selection/registry contract but does not define the returned fields, error handling, registration endpoint or submission/result behavior. Independent slices must guess how to construct the selector, report a registry error, determine availability of registration, and preserve the selected identity. A proposed path-bearing list would also contradict the stated limit on filesystem paths exposed by read requests.
**Impact:** Backend and UI can ship incompatible data shapes or accidentally disclose registered paths, forcing cross-slice rework.
**Suggested fix:** Specify a shared typed layout/page contract with `currentId: string | null` (`null` means launch), `workspaceKey: string`, `projects: Array<{id: string; name: string}>`, `registrationAllowed: boolean`, and optional actionable `registryError`. Define which recoverable errors leave the launch view usable and require invalid explicit selections to fail visibly. Specify one dedicated registration route/action, its name/path form fields, validation error shape, and success navigation/selection behavior; server returns only fields needed by the UI. Document the expected identity guard and error status from GAP-1. Avoid path-bearing read DTOs.

### GAP-3: Existing registration update cases need exact decisions
**Dimension:** CLI compatibility and registry integrity
**Severity:** RED
**Problem:** The current CLI accepts omitted path and name, derives IDs, merges tags, and updates a record matched by ID or path while retaining links. The design says both to retain CLI behavior and prevent retargeting, but does not specify what happens when a path matches an existing record and the generated or explicit ID differs, or when name and tags are omitted. Changing an ID can break `dependsOn` and `relatedProjects` references.
**Impact:** Implementers may reject ordinary repeat registrations, unexpectedly rename IDs, erase metadata, or break project links.
**Suggested fix:** Preserve omitted path defaulting to the launch/current CLI root, optional name and ID, default slug generation for new records, custom registry, JSON output, and tag merging. Specify that a unique canonical path match retains its existing ID when no ID was explicitly supplied; an explicitly different ID or a matching ID with a different canonical path fails with a collision rather than renaming or retargeting. Preserve existing name when omitted and preserve relationship arrays; update a supplied name and merge supplied tags. ID/path matching different records fails. Test these branches, existing v1 records, and symlink-equivalent paths.

## Questions

None requiring a product decision if the proposed conservative compatibility rules are accepted.

## Recommendation

Revise the design and its shared contract before implementation. Re-review the identity guard and collision branches after revision.

## Revision review

**Status: APPROVED.** The review-resolved contract in the design and SPEC-063 addresses all three findings. It defines shared DTOs and registration responses, guards registered background requests and spec-answer submissions against changed real-root identity while preserving legacy launch behavior, and states repeat-registration compatibility and collision rules. The stated tests should verify those behaviors during implementation.
