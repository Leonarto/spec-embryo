+++
doc_kind = "spec"
id = "SPEC-013"
title = "Add deterministic memory query and briefing services"
summary = "Borrow Obsidian-style retrieval ideas such as backlinks, local graph neighborhoods, properties-aware search, aliases, and quick access, but implement them as deterministic CLI and service primitives for Spec Embryo memory."
status = "active"
task_ids = ["TASK-046", "TASK-047", "TASK-048", "TASK-049", "TASK-050"]
tags = ["memory", "retrieval", "query", "obsidian"]
owner = "human-ai"
updated_at = "2026-04-08T15:10:18.019Z"
+++

# Problem

Spec Embryo stores durable memory well, but active agents still have to reconstruct too much of that memory manually.

Today an agent can read:

- current state
- specs
- tasks
- handoffs
- doctor output

But it cannot yet ask deterministic retrieval questions such as:

- what links to this spec?
- what decisions already exist around this topic?
- what is the local neighborhood around a task or spec?
- what docs match these tags, statuses, and aliases?
- give me the smallest useful brief for implementation, review, or migration work

This makes memory storage stronger than memory access. The next major product step is to let humans and agents retrieve the right slice quickly, deterministically, and cheaply.

This spec borrows ideas from Obsidian's retrieval model rather than its editor model:

- backlinks and outgoing links
- local graph / neighborhood views
- properties-aware filtering
- aliases and quick access
- bookmark-like important entrypoints
- search as navigation rather than only text matching

The goal is not to clone Obsidian. The goal is to make Spec Embryo's repo-native memory easier for agents to traverse and compress into the right working context.

# Context

Relevant Obsidian patterns from public docs:

- backlinks and unlinked-mention-oriented navigation
- graph views and local neighborhoods
- properties as typed metadata with search support
- aliases as alternate names for notes
- quick-switcher-style fast access
- bookmarks for durable entrypoints

Spec Embryo already has strong typed metadata in frontmatter and strong deterministic linking between specs, tasks, current state, and handoffs. That means the product can borrow the access patterns without inheriting the note-editor complexity.

# Goals

- Add a deterministic memory index service over managed docs.
- Add a deterministic link-graph service that exposes incoming, outgoing, and neighborhood relationships across managed memory.
- Add CLI retrieval commands that let humans and agents query memory by text, typed properties, links, and neighborhoods.
- Add brief-building services that return compact working context for a spec, task, topic, or doc neighborhood.
- Make tags more explicitly useful for retrieval by documenting how adoption and migration should preserve and normalize meaningful tags.
- Make the default outputs useful for active agents without forcing them to read large files or verbose doctor/init output every time.
- Preserve the local-first, file-backed model with no external database or hosted search dependency.

# Non-Goals

- Do not build a full Obsidian-style note editor.
- Do not add vector databases, embeddings, or semantic search in v1 of this slice.
- Do not make retrieval depend on remote services or model calls.
- Do not replace current state, handoffs, doctor, or resume; this slice complements those workflows.
- Do not build a fully interactive graph UI in the first implementation.
- Do not attempt broad free-form NLP over arbitrary repo files outside managed memory in the first implementation.
- Do not hard-enforce a global closed tag taxonomy in the first implementation.

# Constraints

- Retrieval must remain deterministic and reproducible from repo files.
- Query and brief services should reuse the canonical repository/domain services rather than inventing a second parser.
- JSON outputs must be stable enough for agent consumption.
- Default human-readable outputs should stay compact and scan-friendly.
- The design should work for both the Spec Embryo repo itself and externally adopted repos.
- Tag guidance must be explicit enough that migration/adoption outputs teach another agent how tags support retrieval, even before any hard tag checker exists.

# Proposed Approach

Add a new retrieval layer in `src/services/` built around three primitives:

1. Memory index

- Build an in-memory index from managed docs already loaded through canonical parsing.
- Index typed properties such as:
  - `doc_kind`
  - `id`
  - `title`
  - `summary`
  - `status`
  - `tags`
  - `owner`
  - `owner_role`
  - link fields such as `task_ids`, `spec_ids`, `depends_on`, `blocked_by`
- Also index normalized lookup terms from:
  - titles
  - summaries
  - tags
  - aliases if/when introduced

2. Link graph

- Build deterministic edges between managed docs:
  - spec -> task
  - task -> spec
  - task -> dependency
  - task -> blocker
  - current -> active/blocked spec/task
  - handoff -> related spec/task
- Expose:
  - outgoing links
  - incoming links / backlinks
  - local neighborhood
  - related docs grouped by relation type

3. Brief builder

- Build compact context bundles around:
  - one spec
  - one task
  - one doc ID
  - one topic/query
  - one local neighborhood
- Briefs should be optimized for agent continuation and avoid copying large document bodies by default.

4. Tag-aware retrieval hygiene

- Retrieval should treat tags as first-class query inputs.
- Adoption and migration guidance should explicitly say how to preserve useful legacy topical labels as tags when they improve retrieval.
- The first implementation should recommend stable, short, retrieval-friendly tags without requiring a global enforced taxonomy.

# Detailed Specification

## New services

Add reusable services in `src/services/`:

- `memory-index.ts`
- `memory-links.ts`
- `memory-brief.ts`

Responsibilities:

- `memory-index.ts`
  - flatten managed docs into a queryable deterministic index
  - support typed filtering and normalized text matching
- `memory-links.ts`
  - compute incoming/outgoing relationships and local neighborhoods
  - provide relation labels such as `implements`, `implemented-by`, `depends-on`, `blocks`, `referenced-by-current`, `mentioned-in-handoff`
- `memory-brief.ts`
  - compose small working-context bundles from index + links + current state

These services should be structured so future additions such as aliases, bookmarks, or tag normalization checks can layer on without redesigning the command family.

## CLI surface

Add a new top-level memory namespace:

- `spm memory query`
- `spm memory links`
- `spm memory brief`

### `spm memory query`

Purpose:

- property-aware retrieval
- quick-switcher-like lookup
- cheap agent-readable search over managed memory

Initial flags:

- `--text "..."` free text over indexed fields
- `--doc-kind spec|task|handoff|current-state`
- `--status ...`
- `--tag ...`
- `--id ...`
- `--linked-to DOC-ID`
- `--neighbor-of DOC-ID`
- `--limit N`
- `--json`

Behavior:

- all filters are deterministic
- `--text` is token/substring-style matching, not semantic search
- `--tag` should behave predictably over stored tag values and normalized tag lookups
- results default to a compact list with:
  - id
  - kind
  - title
  - status if present
  - one-line summary
  - key relation hints when relevant

### `spm memory links <DOC-ID>`

Purpose:

- Obsidian-style backlinks/outgoing-links view for managed memory

Behavior:

- show:
  - outgoing relations
  - incoming relations
  - one-hop neighborhood
- support `--json`
- support `--depth 1|2` for deterministic neighborhood expansion
- depth defaults to `1`

### `spm memory brief`

Purpose:

- generate the smallest useful working context for an agent or human

Entry modes:

- `--id DOC-ID`
- `--spec SPEC-ID`
- `--task TASK-ID`
- `--text "topic"`

Optional controls:

- `--include-neighbors`
- `--include-current`
- `--include-handoffs`
- `--profile implementation|review|migration`
- `--json`

Behavior:

- default output is compact prose/bullets
- JSON output returns structured sections
- profile changes emphasis, not source of truth:
  - `implementation`: active tasks, dependencies, related specs, current focus
  - `review`: review tasks, linked decisions, recent handoffs, blockers
  - `migration`: doctor-relevant context, scaffold state, adoption-related docs

## Obsidian-inspired behaviors to adopt

### Backlinks

- For any managed doc, show what points into it.
- This is the strongest retrieval feature to borrow first.

### Local graph / neighborhood

- Expose immediate neighbors and typed relation groups.
- This should work in CLI and later feed UI improvements.

### Properties-aware search

- Frontmatter fields are first-class query inputs, similar to Obsidian properties.
- Filters should be explicit flags in v1, not a mini query language.

### Tags as retrieval handles

- Tags should be treated as lightweight retrieval handles rather than as a replacement for statuses, links, or document kind.
- Adoption guidance should tell another agent to preserve meaningful legacy topical labels as tags when they improve retrieval.
- Tags should be short and stable where possible.
- Synonym drift should be discouraged in guidance, even if v1 does not yet enforce a canonical tag registry.
- Later work can add tag linting or normalization suggestions, but v1 should already make tags queryable and intentionally documented.

### Aliases

- Reserve room for future alias support.
- In v1, retrieval should already be structured so aliases can be indexed later without redesigning the command family.

### Quick access

- `memory query --text` should behave like a deterministic quick switcher over managed docs, not like a full-text grep replacement.

### Bookmarks

- Bookmark-like pinned entrypoints are useful, but defer first implementation unless they are needed to make briefs useful.

## Output shape

Default human output should stay small.

Principles:

- list first, essay second
- prefer grouped bullets over repeated prose
- no giant document dumps
- include file paths only when they materially help navigation

JSON outputs should include:

- `query`
- `filters`
- `results`
- `relations`
- `brief`
- `counts`

Exact field shape can evolve during implementation, but top-level keys should remain stable once introduced.

## Integration points

- `doctor` can eventually recommend `spm memory brief --profile migration` during adoption
- `resume` can eventually consume memory-brief services instead of hand-assembling all compact context itself
- UI detail pages and future graph panels can reuse the same link/brief services
- Adoption artifacts should eventually mention that tags are one of the intended handles for later `memory query` retrieval.

# Edge Cases

- docs with no outgoing links but many incoming links
- tasks shared by multiple specs
- archived tasks that should appear in analytical briefs but not active-only operational briefs
- partially adopted repos where some docs fail parsing
- topic queries that match many docs with weak text signals
- duplicate or conflicting titles where IDs must stay primary
- future alias support introducing multiple names for one doc
- legacy repos with rich topical labels but inconsistent tag spellings

# Acceptance Criteria

- A deterministic service layer can index managed memory and answer typed queries without re-parsing docs in multiple places.
- `spm memory query` can filter by text and typed properties and return compact results.
- `spm memory links <DOC-ID>` can show incoming and outgoing managed-memory relations.
- `spm memory brief` can build compact context for at least spec, task, and topic-driven workflows.
- JSON outputs are available for all new memory commands.
- The spec and adoption docs make tag usage explicit enough that another agent knows tags are intended retrieval handles, not accidental metadata.
- The implementation is clearly useful for agent continuation and retrieval in external repos, not only for the Spec Embryo repo itself.
- No external search service, vector store, or model call is required.

# Open Questions

- Should bookmark-like pinned memory entrypoints ship in the first slice, or should they follow after query/links/brief are solid?
- Should `memory brief` profiles ship in v1, or should the first version expose one generic brief shape only?
- Should we eventually support a compact query syntax inspired by Obsidian search operators, or keep v1 strictly flag-based for determinism and clarity?
- Should tag guidance remain soft and documented only at first, or should a later follow-up add doctor/checker suggestions for tag normalization?
