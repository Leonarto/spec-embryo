+++
doc_kind = "spec"
id = "SPEC-060"
title = "Harden self-hosting test reliability"
summary = "Reduce flake-prone behavior so SpM can serve as dependable infrastructure across many repos and repeated publish cycles."
status = "proposed"
task_ids = ["TASK-121", "TASK-122"]
tags = ["testing", "reliability", "self-hosting", "ci"]
updated_at = "2026-05-20T22:15:00Z"
+++

# Overview

This slice improves test reliability and failure diagnostics so SpM can remain dependable as shared infrastructure across many repositories.

# Context

Once SpM becomes part of the daily loop for many projects, flaky tests stop being a local nuisance and become product friction. The repo already has strong coverage, but some areas are naturally more sensitive to timing, git state, process scheduling, and filesystem interactions.

# Goals

- Identify and reduce the most flake-prone self-hosting test patterns.
- Isolate time-, git-, and process-sensitive behavior more cleanly.
- Improve diagnostics so failures are faster to classify and repair.
- Keep release preparation trustworthy by reducing false negatives.

# Non-Goals

- Do not chase 100% elimination of all nondeterminism in one slice.
- Do not rewrite the whole test suite or swap test frameworks.
- Do not weaken coverage merely to make failures disappear.

# Constraints

- Reliability work should preserve or improve test signal, not mask failures.
- Deterministic repo workflows should stay testable without overfitting to one environment.
- Diagnostics should help future agents localize flaky failures quickly.

# Proposed Approach

Audit the most timing- and environment-sensitive tests, refactor them toward better isolation, and add focused diagnostics around common failure classes so self-hosting and release workflows remain dependable.

# Detailed Specification

- Flake-prone test areas are identified and tracked explicitly.
- Time-, git-, lock-, and process-sensitive tests are isolated behind clearer helpers or fixtures where practical.
- Failure output should distinguish likely product regressions from environment-sensitive setup issues.
- The repo should have a repeatable way to run or diagnose historically flaky areas without guesswork.

# Edge Cases

- Some flaky behavior may only appear under CI-like load or after repeated runs.
- Tests that intentionally exercise real git behavior still need bounded realism.
- Diagnostics should avoid becoming so noisy that they hide the real failure.

# Acceptance Criteria

- The most important flaky test surfaces are documented and reduced.
- Sensitive test areas gain better isolation or fixtures.
- Failure diagnostics improve for common self-hosting and release-prep issues.
- The suite remains coverage-oriented rather than artificially silenced.

# Open Questions

- None for this planning slice; exact flaky targets can be prioritized in the tasks.
