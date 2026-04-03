+++
doc_kind = "spec"
id = "SPEC-007"
title = "Upgrade the Gantt view into a compact professional timeline"
summary = "Define a denser, Microsoft Project-inspired timeline view that stays deterministic, readable, and useful without date estimates."
status = "done"
task_ids = ["TASK-021", "TASK-022", "TASK-023"]
tags = ["ui", "gantt", "timeline", "design"]
owner = "human-ai"
updated_at = "2026-04-03T15:36:32.664Z"
+++

# Overview

Replace the current lightweight timeline with a denser, more professional planning surface inspired by project-management tools such as Microsoft Project, while keeping the data deterministic and compact enough for daily use inside Spec Embryo.

## Context

The current timeline proves that dependency order and default effort can be visualized without dates, but it still looks like a first iteration. As the project grows, users will want a compressed view that lets them scan many tasks at once, understand sequence and grouping quickly, and inspect a broad planning horizon without excessive card chrome or wasted space.

The goal is not to copy Microsoft Project literally, but to borrow the qualities that make it effective:

- dense information display
- easy left-to-right scanning
- strong grouping and hierarchy
- clear relation between rows, phases, and bars
- low visual noise despite large data sets

## Goals

- Make the Gantt view feel professional, deliberate, and information-dense.
- Support compressed scanning of many tasks without turning the page into visual clutter.
- Preserve deterministic positioning and sizing while explicit date estimates do not yet exist.
- Support grouping and filtering by spec and related planning slices.
- Make dependencies, status, and review state legible at a glance.

## Non-Goals

- Do not introduce real calendar scheduling in this slice.
- Do not require explicit start and due dates.
- Do not add drag-and-drop editing in the first professional-timeline upgrade.
- Do not replace the Kanban or detail views as the primary editing surface.

## Constraints

- The view must still be powered by the same deterministic domain and shared services.
- The layout must stay usable on typical laptop widths.
- Dense does not mean tiny; labels and statuses still need to be readable.
- The UI should remain clearly repo-native rather than looking like a generic SaaS clone.

## Proposed Approach

- Move from large card-like timeline rows to a compact split-pane planning view:
  - left pane with grouped row labels and key metadata
  - right pane with compressed bars in a scrollable planning grid
- Group rows primarily by spec, with tasks nested beneath each group.
- Keep a deterministic horizontal scale based on relative effort units and dependency order until explicit dates exist.
- Use compact visual encodings for:
  - status
  - review state
  - archived or hidden state later
  - dependency relationships
- Add sticky row headers and timeline headers so large plans remain navigable.

## Detailed Specification

- The timeline should default to a compressed row height rather than card-height rows.
- Each row should show the minimum stable metadata needed for scanning:
  - task ID
  - task title
  - linked spec or group
  - status
  - effort indicator
- The main chart area should use a consistent grid so relative spans are easy to compare.
- Spec groups should be collapsible in a later iteration, but the first slice may render all groups expanded if that keeps complexity under control.
- Dependency relationships should remain deterministic and legible without overwhelming the chart.
- The view should support filtering down to:
  - one spec
  - multiple specs
  - active-only or include-completed modes
- Completed or cancelled work should visually recede compared with active work.
- Review work should have a distinct visual treatment from generic in-progress work.
- The compressed timeline should remain horizontally scrollable while preserving sticky grouping and row context.

## Edge Cases

- Very long task titles should truncate safely without destroying row alignment.
- Many tasks with the same relative start position should remain readable without total overlap confusion.
- A spec with no active tasks should still render sensibly when included in the filter.
- Dense layout should not make status or review markers ambiguous on smaller screens.

## Acceptance Criteria

- The timeline view supports a visibly denser and more professional layout than the current v1 version.
- The view can display a larger number of tasks without becoming immediately overwhelming.
- Spec grouping remains legible in the compressed layout.
- Relative effort and dependency order remain deterministic and visible without explicit dates.
- Status and review state can be read at a glance from the chart.

## Resolved Decisions

- The left metadata pane should include a small number of extra scanning columns in the first dense version: status, effort, and dependency count.
- The first dense version should defer dependency connector lines if they create too much noise; priority goes to grouping, density, and legibility first.
