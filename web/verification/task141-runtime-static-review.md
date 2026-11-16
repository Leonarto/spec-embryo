# TASK141 independent static implementation review

Decision: v5 runtime/build/CLI source is approved to proceed to the authorized combined build, fresh archive installation and functional package/browser gates. No blocking static finding remains. This is not approval of the final package, integration or performance acceptance; those require exact final artifacts and their independent review.

Verified the unique v5 patch SHA256 f0a945c650575bdc7244ede6595f370068c6127e65390a9ac6a729ba440ff700 and source manifest SHA256 a2b214f6e0fd63603b4ef464eb21bcb3fd3a9169efbc38722533225a4d8d9153, plus all 22 actual owned source hashes. Original base identities were checked against a42cccb Git blobs. Earlier v2 paths were superseded during review; use the unique v5 artifacts for this approval. Accepted component fixes are separate inputs to the final combined build, not runtime-owned changes.

Reviewed launcher/service/artifact helper, custom Node wrapper, explicit builder and adapter configuration, package contents/dependency changes, CLI help, focused tests and the root-authorized test-diagnostics upkeep. The shared repository reader, memo, domain services and guarded action implementation are outside and unchanged by this patch.

Resolved findings:

1. HTTP default port: omitted Host port now normalizes to 80, so supported port-80 browser requests work. Omission remains a different authority on non-80 listeners; duplicate/malformed/foreign authorities remain rejected.
2. Intermediate symlinks: manifest reads and inventories validate every package-relative directory ancestor. Builder validates output ancestry before invalidating or writing any output. Negative tests preserve an outside success sentinel when web or web/build is a symlink.
3. Node executable identity: platform-aware absolute-path validation replaces a POSIX-only slash prefix, retaining actual-Node and minimum-version checks.
4. Browser host identity: accepted numeric IPv4 forms use WHATWG normalization consistently for bind, advertised origin and authority comparison. Brackets are restricted to IPv6; bracketed DNS/IPv4 and unmatched brackets are rejected. No alternate address or wildcard trusted-origin behavior is added.

The two earlier implementation adjustments are also in contract. Explicit exit after listener closure/deadline prevents application timers or pending imports from retaining the dedicated child. The existing six-case lifecycle log includes completed-response drain, IPC disconnect, startup cancellation, repeated signals, IPv6, startup failure and the real 30-second stalled-response deadline. Builder-controlled sourceDigest replaces Kit's clock-derived version; uncertified low-level builds cannot mint the manifest. Recorded repeated-build identity evidence is useful for that mechanism but is not the final package identity after subsequent source changes.

Independently ran only the five focused non-server suites on exact v5: 12 tests, 114 assertions, zero failures. These cover launch preconditions, artifact identities and aliases, failed-build invalidation, flag/Host/Node normalization and diagnostic registration. Did not repeat the 30-second lifecycle suite, full coverage suite, build, package installation or performance series. The previously recorded full-suite storage-heartbeat failure and targeted recovery remain separate evidence; this review does not relabel that full run as clean.

Verified the documented `bun run ui -- --dev` forwarding with a tiny owned script fixture using the exact package script and actual parser: Bun 1.3.9 forwards [ui, --dev], parsed dev=true. No server was started for that check.

Final package review must consume the accepted component blobs and the exact fresh tarball, installed production dependencies and read-only prefix. It must prove real installed browser hydration/lazy detail/Mermaid/editor flows as well as the HTTP/SSR/action/security/lifecycle checks. An SVG in returned HTML or a checkout build alone is not that proof. Root maintains documentation and coordinates the subsequent reviewed commit and finite acceptance window. All latency thresholds and historical failures remain unchanged.
