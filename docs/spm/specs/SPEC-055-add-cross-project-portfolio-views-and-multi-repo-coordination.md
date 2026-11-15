+++
doc_kind = "spec"
id = "SPEC-055"
title = "Add cross-project portfolio views and multi-repo coordination"
summary = "Let SpM operate across many repositories with a deterministic portfolio view, explicit project relationships, and shared planning signals."
status = "done"
task_ids = ["TASK-111", "TASK-112"]
tags = ["portfolio", "multi-repo", "planning", "adoption"]
updated_at = "2026-05-20T17:24:06.055Z"
+++

# Overview

This slice expands SpM from a strong single-repository workflow into a multi-repository coordination tool. The goal is to keep repo-local memory as the source of truth inside each project while adding a deterministic cross-project layer for status, search, and dependency awareness.

# Context

SpM is already effective inside one repository, but repeated daily use across many software projects still requires too much manual hopping between repos. The missing layer is not more repo-local memory; it is a user-local portfolio index that can summarize active work, search across projects, and model explicit relationships between repos that ship together.

# Goals

- Add a deterministic cross-project portfolio registry and read surfaces.
- Surface cross-project status, focus, and search without opening each repo manually.
- Model explicit project-to-project relationships such as dependencies and shared milestones.
- Keep repo-local docs as the source of truth while making cross-repo coordination visible.

# Non-Goals

- Do not add hosted sync, cloud storage, or multi-user collaboration in this slice.
- Do not replace repo-local specs, tasks, or current state with portfolio-level documents.
- Do not add automatic dependency inference from package manifests as the only supported path.

# Constraints

- Keep the feature local-first and deterministic.
- Avoid changing the current single-repo workflow for users who do not opt into portfolio features.
- Represent cross-project links explicitly enough that agents do not need to infer intent from prose.
- Keep portfolio data additive to existing repo-local managed memory rather than replacing it.

# Proposed Approach

Introduce a user-local portfolio registry that points at known SpM projects and stores optional metadata about how they relate. Add portfolio read commands that aggregate repo-local state into a deterministic cross-project view, then add explicit relationship fields so shared milestones and dependency edges can be surfaced without scraping arbitrary docs.

# Detailed Specification

- SpM exposes a user-local portfolio concept that can enumerate known repositories without requiring one repo to contain all others.
- Portfolio read surfaces summarize project identity, recorded tool version, current focus, active specs/tasks, repo health, and last known git state where available.
- Portfolio search supports deterministic text queries across project summaries and key managed docs.
- Project relationship metadata supports at least:
  - depends-on project links
  - related-project links
  - shared milestone or rollout grouping
- Cross-project relationships are additive metadata; repo-local specs and tasks remain the canonical place for implementation work.
- Portfolio surfaces should degrade cleanly when a project is missing, stale, partially adopted, or temporarily unavailable.

# Edge Cases

- Projects may move on disk or become unavailable; portfolio commands should report stale entries instead of failing wholesale.
- Some repos may be partially adopted and lack fully valid current-state docs.
- A project may appear in the portfolio without any cross-project links yet.
- Shared milestones may involve repos on different SpM versions.

# Acceptance Criteria

- SpM has a deterministic portfolio concept that works across multiple repos.
- Users can list or inspect project-level status from one place.
- Users can search across registered projects without manually entering each repo.
- Cross-project relationship metadata exists and is surfaced consistently.
- Repo-local managed memory remains the source of truth for per-project execution.

# Open Questions

- None for this planning slice; implementation tasks can choose exact file layouts as long as the global registry remains deterministic and user-local.
