# AGENTS

This folder contains execution backends.

- `deterministic` and `prompt` are first-class and should remain useful without any external agent CLI.
- `codex` and `claude` are adapters, not the product center.
- Keep backend-specific behavior behind the shared backend interface.
- Prompt-return should avoid nested AI usage when the caller is already an agent.
- Subprocess backends should share one launch-plan contract instead of each inventing prompt serialization.
- Prefer explicit prompt tokens over ad hoc inline strings: `{prompt_text_file}` and `{prompt_bundle_file}` are the clearest defaults.
- Keep legacy token aliases stable when practical so existing backend configs do not break silently.
- If subprocess behavior changes, document spawn assumptions, token replacements, and env vars here.
