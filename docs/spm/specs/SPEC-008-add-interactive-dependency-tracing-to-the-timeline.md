+++
doc_kind = "spec"
id = "SPEC-008"
title = "Add interactive dependency tracing to the timeline"
summary = "Add interactive timeline highlighting for cross-spec dependencies, blocked work, and related specs so the Gantt becomes a planning and diagnosis surface instead of only a static view."
status = "done"
task_ids = ["TASK-027", "TASK-028", "TASK-029"]
tags = ["ui", "timeline", "dependencies", "interaction"]
owner = "human-ai"
updated_at = "2026-04-03T18:01:00.000Z"
+++

# Overview


The current compact timeline is good for dense scanning, but it is still mostly static. Users can see sequence and effort, yet they cannot easily answer higher-value diagnostic questions directly inside the chart:

- which tasks does this task depend on?
- which tasks are blocked because of this task?
- where do cross-spec dependencies exist?
- which other specs are entangled with the selected slice?

This slice turns the timeline into an interactive planning and diagnosis surface while staying deterministic and file-backed.

## Context


Spec Embryo already computes deterministic task dependencies, effective task status, spec grouping, and a compact timeline layout. That means the project already has enough structured data to support dependency tracing without introducing LLM behavior or manual graph annotation.

What is missing is interaction: the user cannot select a task and see the surrounding execution graph in a focused way.

Cross-spec dependencies are especially important because they often reveal why one spec appears blocked even when its own task list looks healthy. The timeline should make those cross-spec edges legible instead of forcing the user to reconstruct them mentally from `depends_on` fields.

## Goals


- Let a user click a timeline task and immediately see its execution neighborhood.
- Highlight immediate upstream dependencies differently from downstream dependents, and distinguish currently blocked downstream work as a stronger subset of that downstream path.
- Make cross-spec dependencies visibly reflected in the grouped timeline instead of disappearing inside the grouping model.
- Highlight related specs when the selected task touches or depends on work outside its primary spec group.
- Keep the interaction deterministic, fast, and derived only from repo-backed task relationships.

## Non-Goals


- Do not add drag-and-drop editing or timeline mutation in this slice.
- Do not introduce probabilistic reasoning or inferred dependencies beyond explicit `depends_on`.
- Do not add full graph-visualization chrome or a separate graph page.
- Do not add complex multi-node selection or saved dependency views in the first iteration.

## Constraints


- The interaction must use the shared deterministic service layer rather than re-deriving graph relationships in the route.
- The timeline should remain usable without JavaScript-enhanced interaction; selection behavior may enhance the experience but should not be required for the base timeline to render.
- Cross-spec highlighting must remain readable within the existing grouped timeline rather than turning into a generic network diagram.
- Dense layout and scanability remain priorities; the interaction cannot overwhelm the chart with noisy permanent connectors.

## Proposed Approach


- Add a deterministic relation model for each timeline row that includes:
  - immediate upstream dependencies
  - immediate downstream dependents
  - currently blocked downstream tasks
  - related spec IDs touched by those edges
  - whether a row participates in a cross-spec dependency
- Add interactive task selection in the timeline route.
- When a task is selected:
  - emphasize the selected row and bar
  - highlight immediate upstream dependencies in one color
  - highlight downstream dependents in a different color family from upstream dependencies
  - highlight currently blocked downstream tasks as a stronger subset of the downstream dependent treatment
  - highlight related spec groups that participate in the selected dependency neighborhood
  - visually mute unrelated rows without hiding them
- Only show cross-spec relationship emphasis once a task is selected.

## Detailed Specification


- Each timeline row should carry deterministic relationship metadata derived from explicit task dependencies only.
- The relation model should distinguish at least these categories:
  - `selected`
  - `dependency`
  - `dependent`
  - `blocked-dependent`
  - `related-spec`
  - `cross-spec-related`
- Immediate upstream dependencies should use a distinct highlight color from blocked downstream tasks.
- Downstream dependents should remain visible even when they are not currently blocked, so the timeline can show both historical unblocking relationships and still-blocked work.
- When a selected task has dependencies or dependents in another spec, the corresponding spec group header should receive a related-state treatment.
- A task with no dependency neighborhood should still be selectable, with a clear isolated-state treatment rather than appearing broken.
- Selection should be easy to clear so the timeline can return to default scan mode.
- The deterministic service layer should expose enough structure that future views can reuse the same relation model without rebuilding graph logic in the UI.

## Edge Cases


- A task may belong to multiple specs; the related-spec highlight should not duplicate the same row or group.
- A selected task may have both same-spec and cross-spec dependencies; both should remain legible.
- A selected task may have downstream dependents that are not currently rendered because of filters or active-only mode.
- A selected task may have no unresolved blocked dependents, only completed downstream work.
- A spec group may need to show related-state styling even if the selected task itself lives in another group.

## Acceptance Criteria


- Clicking a timeline task highlights its dependency neighborhood deterministically.
- Immediate dependencies, downstream dependents, and currently blocked downstream tasks use visibly different treatments.
- Cross-spec relationship emphasis appears when a task is selected and makes the related spec groups legible.
- Selecting a task makes related spec groups legible without hiding the rest of the timeline.
- The interaction is powered by shared deterministic service data rather than route-local graph reconstruction.

## Resolved Decisions

- Question: Should blocked-task highlighting include only immediate downstream dependents, or the full transitive blocked chain?
  Answer:
    we could separate the immediates with the full transitive by color, make the immediate a color and the transitivie a lighter color of the same color.

- Question: Should related-spec highlighting include only directly connected specs, or every spec touched by the selected dependency neighborhood?
  Answer:
    we could separate the connected with the dependency neighbor by color, make the connected a color and the others a lighter color of the same color.

- Question: Should cross-spec participation have a subtle always-on marker, or only appear once a task is selected?
  Answer:
    only appear once a task is selected.
