# AGENTS

Managed tasks live here.

- Keep `spec_ids`, `depends_on`, and `status` accurate.
- Use dependencies to encode real sequencing, not aspiration.
- For parallel slices, record file ownership and frozen review evidence; dependencies describe required work, not model availability.
- Prefer moving implementation work into `review` before marking it `done`.
- If review finds issues, do not move the task to `done` yet. Fix the findings first, then mark it `done` only after the review concerns are resolved.
- After the review findings are fixed and the task is ready, commit the work before starting the next task so future diffs and reviews stay focused.
- When work changes shape materially, update the task doc instead of leaving stale scope behind.
- Done tasks should remain readable as resume history, not just be checked off.
