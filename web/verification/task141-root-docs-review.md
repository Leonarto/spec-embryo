# TASK141 concrete root documentation review — APPROVED

Reviewed the eight parent-owned working-tree documentation/guide diffs against the approved isolated runtime v5 and its static review. Read actual launcher, artifact/build configuration and Node wrapper at `/private/tmp/spm-ui-runtime-sol`. No blocking mismatch and no product edits. This approval concerns documentation alignment, not final runtime/package or performance acceptance.

The text correctly describes Node>=22.12 alongside the Bun CLI, explicit checkout build and contributor DEV, source-only GitHub installation limits, one-time source/lock/output verification, failure without fallback, bounded actual binding, advertised Host versus form-Origin CSRF, read-only installed assets, and guarded questions as the sole UI write. Guide compression preserves projection-local indexing and the root policy. Publish instructions retain the manual final-publish/2FA boundary and require a real external-prefix browser check, not HTML-only proof.

Two editorial corrections are authorized without product changes or another functional run:

- Architecture should attribute canonicalizing the project root to the launcher (`resolveUiLaunchConfig`), not the Node wrapper. The wrapper receives it and establishes origin before handler import.
- Publish guidance should distinguish archive contents from external dependencies: the archive includes their production declarations; remaining bare imports must resolve from installed production dependencies in the test prefix. Do not imply node_modules dependencies must themselves be vendored into the tgz.

Apply with final reviewed runtime names and after the code/package gate; no release or version bump is authorized by this review. No tests, build or browser were run.

Reviewed working-tree SHA256 values before those two wording corrections:

- `README.md`: `83d5341752f968ac4ab38bd732dee15ef1544d726e44c6860fdd4385a117cd5f`
- `docs/architecture.md`: `0187c8e67c660604ff7489b2e2512f1f724dbb8855634c86a23edb5c6d383a8a`
- `web/AGENTS.md`: `adb863d2a459a29d1676152e8f675fd4705c2c9724e5ae3bcf885a5b37632a04`
- `scripts/AGENTS.md`: `744d2907eab7fd3fd7060835b49ab001928952df0190f1207aec43fee2a6ed37`
- `src/commands/AGENTS.md`: `9816df72120048047b4ded1c1da26cf0971c827128e873027ff8aed4027bd3f1`
- `src/services/AGENTS.md`: `33a19d8f26348164d722b5b8a3d82f538fad3d142661b9644cd6c0abd1cf7657`
- `web/verification/AGENTS.md`: `793aed80c6e1bdbfc149dd61b861a5f3bd429ceb774d224de086ed946edc4ac1`
- `skills/publish/SKILL.md`: `135d1c0a6b9e45c44bce35c5d7a75c89f8e24519a539462222df9d34f8ced6c5`
