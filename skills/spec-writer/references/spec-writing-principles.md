# Spec writing principles

These principles are adapted from official prompt-engineering guidance and local successful patterns.

## Distilled rules

- Write clear, direct, specific instructions.
- Provide context, intended audience, and success criteria.
- Use sequential structure and explicit sections.
- Include examples or scenarios where ambiguity would otherwise remain.
- Prefer deterministic fields and concrete nouns over vague prose.
- Make acceptance criteria empirically testable.
- Separate stable intent from open questions.

## Why this fits LLM agents

OpenAI, Anthropic, and Google all emphasize clear instructions, explicit context, structured prompts, and examples. Those same traits make a technical spec more implementable by an agent.

OpenSpec is also a useful signal: its requirement/scenario format shows the value of explicit expected behavior and concrete scenarios, even if this repo uses a different file format.

## Source links

- OpenAI Prompt Engineering: https://platform.openai.com/docs/guides/prompt-engineering
- Anthropic Prompt Engineering Overview: https://docs.anthropic.com/en/docs/prompt-engineering
- Anthropic Be Clear, Direct, and Detailed: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct
- Google Gemini Prompt Design Strategies: https://ai.google.dev/gemini-api/docs/prompting-strategies
- OpenSpec overview and requirement/scenario examples: https://openspec.clanker.guru/

## Local adaptation source

The sibling `funnl-chat` repo has strong prior art in its `funnl-spec-writer` skill:

- implementation readiness
- explicit edge cases
- binary acceptance criteria
- structure before coding

This Spec Embryo skill keeps those strengths but adds a required user-iteration step and a mandatory follow-up review/fix loop.
