# AGENTS

This folder contains execution backends.

- Deterministic/prompt remain first-class without a harness. Codex/Claude stay optional shared-interface adapters; prompt-return never nests an agent.
- Subprocess backends should share one launch-plan contract instead of each inventing prompt serialization.
- Prefer explicit prompt tokens over ad hoc inline strings: `{prompt_text_file}` and `{prompt_bundle_file}` are the clearest defaults.
- Keep legacy token aliases stable when practical so existing backend configs do not break silently.
- Prompt bundles retain complete structured data; `resume-render.ts` bounds assembled prompt text in UTF-8 bytes. Prefixes contain only invariant instructions; all project data and interruption windows belong in the variable tail.
- Every backend receives the same optional `ResumeContext.interruption_window`; include it in human output and prompt artifacts without reintroducing it into the stable prefix.
- Opt-in native protocols drain stdout through bounded parsers and omit raw transcript capture; generic P0 output stays intact. Never add provider flags automatically. `{session_id}` is replaced only from a validated explicit receipt; missing configured tokens block resume.
- Spawn is opt-in. Preview paths are `{run-id}` templates; actual runs reserve owned directories via `harness-artifacts.ts`, then clean them after confirmed closure. `--retain-artifacts` and unknown process trees retain diagnostics; never sweep foreign/active directories.
- `harness-process.ts` drains bounded JSON stdout, waits for stream close, and manages monotonic timeout plus SIGINT/SIGTERM forwarding (2s grace, 1s closure). POSIX groups are controlled; Windows tree closure remains unverified. Exit zero confirms only the process, never task completion.
