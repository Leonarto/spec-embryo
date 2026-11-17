# TASK141 independent code and installed-package review

Decision: approve the reviewed v5 implementation and exact functional package proof for root integration. No blocking code/package finding remains. Final combined integration checks and a source checkpoint still precede acceptance timing. This is not a release, performance pass or authorization to run another latency series.

## Frozen identities

- Owned v5 source manifest: a2b214f6e0fd63603b4ef464eb21bcb3fd3a9169efbc38722533225a4d8d9153; patch: f0a945c650575bdc7244ede6595f370068c6127e65390a9ac6a729ba440ff700.
- Final evidence manifest v2: c191fff48abde474bbfe0353619b8849f18cdc464685ff1008a0fc7b0ace9190. Original v1 c8c3135d… remains preserved; v2 adds existing provenance and capture limits, without source/archive changes.
- Archive `/private/tmp/spm-ui-runtime-final-reviewed.tgz`: 9340f57802a2a09c4cc3458f0ee60587c33cbee6ae64e3e33998cb0a389170f5.
- Build ID: 698bfe3987a9717865de1a2745f59d3df0394e48064faf7a2b1c26177c5ab2d7. Source digest: 7b1f540de1b5c96e5442f48b91c0d8dde509a93bfff4f7ae3cc9ce169747df8d.
- Accepted external components: Mermaid d32d4400d705a9d2e84080a0b869ab1215c1515e6361dcb11e0553aa3b80aac4 and TimelineRuler 72682121f297b16257e36c369597cfc098df908e3416d49c48afaba2473080a4.

Verified every referenced evidence hash, all 22 owned source hashes and both component hashes. Independently compared all 196 build inputs and 604 outputs across the archive, installed package and isolated source, including bytes and SHA256. They match exactly. Recomputed canonical sourceDigest/buildId independently. Archive has no symlinks or unexpected build output, and excludes test suites, managed memory, verification, node_modules and private .svelte-kit output. Package source remains deliberately included for the explicit contributor workflow.

The static review is `/private/tmp/spm-task141-runtime-static-review.md`. Its concrete Host default-port/numeric/IPv6, intermediate-symlink and Node-path findings are resolved. Independent focused checks on v5 passed 12 tests / 114 assertions. The lifecycle evidence covers bounded drain, cancellation, disconnect, repeated signals, IPv6 and startup failure; it is distinct from latency measurement.

## Installed functional evidence

The actual archive was installed with production dependencies and scripts disabled into `/private/tmp/spm ui verified prefix`. Its bin launches the reviewed precompiled Node server. Independently confirmed installed manifest equality and read-only package entries. Existing provenance records the full read-only dependency-tree audit and an actual rejected write attempt; initial install/write-rejection output was observed in tools and later documented, not captured as a contemporaneous standalone log.

The frozen package test log passes 2 tests / 121 assertions from two external fixture roots. Reviewed test coverage includes six SSR routes, assets, source/DEV-path exclusion, foreign Host rejection, foreign/missing Origin rejection with unchanged bytes, canonical 400 and 409 responses, recovery above 512 KiB, successful native/enhanced writes, and process/listener cleanup. Generated server imports are bundled; the recorded package closure has no remaining bare production imports.

The final installed-browser smoke adds real trusted Task-link navigation and lazy inspector visibility, rendered Mermaid SVG and named controls, enhanced question completion, and a separate JavaScript-disabled native form submission with readable diagram fallback. It records 62 production JS resources and no DEV resources. Both enhanced and native answers are present in the external specimen; its SHA256 is 6ca72fd21d00187268b8632d36d5be2a800318818fa25bbd61fcb07a9c1c381d. Recorded parent PID 92084/listener 57420 and browser were closed. The package build identity remained unchanged afterward.

Console capture reports zero errors/warnings. No independent pageerror listener was installed, so this review makes no separate zero-pageerror claim. These are functional checks, not latency distributions or the remaining TASK131 accessibility/retention gates. Execution evidence uses Node 25.6; the declared minimum-version predicate is tested separately.

Final isolated Svelte check is 0 errors / 0 warnings, AGENTS check passes, and the recorded initial Tasks static JS closure is 89,134 gzip bytes with Mermaid absent. The earlier full suite remains 483 pass / 2 skip / 1 storage-heartbeat failure; its targeted storage rerun is 3/3. Neither that rerun nor this review turns the earlier full run into PASS or proves its causal explanation.

## Documentation and integration boundary

The archive predates root's reviewed README and guidance edits. README/AGENTS/docs/skills are intentionally excluded from build identity, and those changes do not affect the verified executable/SSR/client bytes. This distinction does not invalidate the functional package proof, but the archive must not be described as byte-identical to a later documentation-complete package.

Before final acceptance:

1. Integrate exact reviewed runtime and component bytes with the separately reviewed root documentation. Verify merged package-owned build inputs against the approved manifest; no conflict resolution may silently change product bytes.
2. Run the required combined checks on the integrated source, serializing expensive build/test work. Keep the prior failing full run visible; resolve any new failure rather than infer success from focused tests. Check instructions after guide updates.
3. Commit and freeze final source/runtime identities before root authorizes the finite acceptance window. If repacking only documentation, record the new archive hash and verify that all executable inputs/outputs remain identical; the functional evidence can be reused with that explicit scope. Any executable/source/dependency change requires the corresponding review/checks before reuse.

No publishing, version bump, performance run or threshold change is approved. TASK138's valid final DEV failures and all prior rejected experiments remain historical evidence. Shared fresh IO/memo, guarded actions and the original cold/warm/detail endpoints and budgets stay unchanged.

This final review read and compared artifacts only; it did not rerun the build, browser, package installation, full test suite or benchmarks.
