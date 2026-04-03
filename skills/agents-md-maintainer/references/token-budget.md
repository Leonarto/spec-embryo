# AGENTS token budget reference

This file records the rationale for the repo's AGENTS sizing policy.

## Important note

There is no single official OpenAI, Anthropic, or Google document that says an `AGENTS.md` file should be exactly N tokens long.

The policy in this repo is an inference from official guidance:

- longer prompts increase cost and latency
- prompt instructions should be concise and explicit
- long-context prompts work best when structured and not padded with unnecessary text
- stable instructions should stay reusable and predictable

## Sources

OpenAI prompt engineering guide:

- stresses clear instructions, reliability practices, and disciplined prompt design rather than bloated prompts
- link: https://platform.openai.com/docs/guides/prompt-engineering

OpenAI prompt caching guide:

- documents that caching applies to prompts with 1024 or more tokens and works best when static prefix content stays identical and early in the prompt
- this is useful for stable repeated instructions, but it is a caching threshold, not an ideal AGENTS size target
- link: https://platform.openai.com/docs/guides/prompt-caching

Anthropic prompt design guidance:

- emphasizes being clear, direct, and specific
- link: https://support.anthropic.com/en/articles/7996853-introduction-to-prompt-design

Anthropic long prompt limit note:

- documents large context windows, which shows capacity is high but does not imply every instruction file should be large
- link: https://support.anthropic.com/en/articles/7996856-what-is-the-maximum-prompt-length

Gemini long-context guidance:

- explains that long context is powerful but should still be used deliberately
- notes that if you do not need tokens, it is best to avoid passing them and that longer queries generally have higher latency
- link: https://ai.google.dev/gemini-api/docs/long-context

Anthropic long-context prompting tips:

- advises putting long-form context high in the prompt and the query at the end for better long-context performance
- supports the idea that structure matters more than dumping extra text everywhere
- link: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/long-context-tips

## Repo policy derived from those sources

Approximate sweet spots for this repo:

- root `AGENTS.md`: best around 600-900 tokens
- scoped folder `AGENTS.md`: best around 150-350 tokens
- hard cap for scoped folder `AGENTS.md`: 500 tokens
- hard cap for root `AGENTS.md`: 1200 tokens
- target active chain of root + nested AGENTS for a working path: under 1800 tokens

Why these numbers:

- small enough to avoid wasting context on repeated setup
- large enough to preserve real workflow constraints
- easy to maintain by hand
- resilient across different agent CLIs and model vendors

## Measurement note

`bun run check:agents` uses an approximate estimator instead of a model-specific tokenizer. That is intentional. The goal is portable guardrails, not vendor lock-in.
