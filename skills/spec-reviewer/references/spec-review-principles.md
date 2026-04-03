# Spec review principles

This review lens combines official prompt-design guidance with local practical patterns.

## Distilled rules

- A strong spec should make the task understandable with minimal implicit context.
- If two competent implementers could produce materially different behavior, the spec is underspecified.
- Sequential structure and clear success criteria make review easier and implementation safer.
- Scenarios, examples, and explicit branches reduce hidden assumptions.

## Review questions

- Could an agent implement this without guessing?
- Are key nouns, actors, and states explicit?
- Are unhappy paths and branch conditions captured?
- Are acceptance criteria actually testable?
- Are open questions separated from decided behavior?

## Source links

- OpenAI Prompt Engineering: https://platform.openai.com/docs/guides/prompt-engineering
- Anthropic Prompt Engineering Overview: https://docs.anthropic.com/en/docs/prompt-engineering
- Anthropic Be Clear, Direct, and Detailed: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct
- Google Gemini Prompt Design Strategies: https://ai.google.dev/gemini-api/docs/prompting-strategies
- OpenSpec overview and scenario examples: https://openspec.clanker.guru/

## Local adaptation source

The sibling `funnl-chat` repo has a strong `funnl-spec-reviewer` skill that aggressively reviews ambiguity and implementation risk before coding. This Spec Embryo version keeps that review posture while adding an explicit requirement to feed consequential unresolved decisions back into the user-iteration loop.
