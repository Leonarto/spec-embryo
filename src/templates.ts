import { basename } from "node:path";
import { serializeTomlFrontmatter } from "./frontmatter.ts";
import { buildManagedPaths } from "./services/layout.ts";
import { CLI_VERSION } from "./services/version.ts";

export function createConfigToml(projectName: string, memoryDir = "docs/spm"): string {
  const managed = buildManagedPaths(memoryDir);
  return `
tool_version = ${JSON.stringify(CLI_VERSION)}
project_name = ${JSON.stringify(projectName)}
memory_dir = ${JSON.stringify(managed.memoryDir)}
state_file = ${JSON.stringify(managed.stateFile)}
handoffs_dir = ${JSON.stringify(managed.handoffsDir)}
specs_dir = ${JSON.stringify(managed.specsDir)}
tasks_dir = ${JSON.stringify(managed.tasksDir)}
skills_dir = ${JSON.stringify(managed.skillsDir)}

[agents]
context_window_tokens = 400000
root_target_ratio = 0.00225
root_hard_cap_ratio = 0.003
chain_target_ratio = 0.0045
chain_hard_cap_ratio = 0.0055
absolute_root_hard_cap = 4000
absolute_chain_hard_cap = 8000

[defaults]
resume_backend = "deterministic"

[nexus]
enabled = false
command = "nexus"
args = []
root_agents_mode = "reference-only"

[backends.deterministic]
enabled = true

[backends.prompt]
enabled = true

[backends.codex]
enabled = false
command = "codex"
args = ["exec", "{prompt_text_file}"]

[backends.claude]
enabled = false
command = "claude"
args = ["-p", "{prompt}"]
`.trimStart();
}

export function createSeedCurrentStateTemplate(projectName: string, updatedAt: string): string {
  return serializeTomlFrontmatter(
    {
      doc_kind: "current-state",
      id: "CURRENT",
      title: "Current Project State",
      summary: "Spec Embryo memory is initialized for this repo; the next step is to capture the real project direction and replace the adoption scaffold with project-specific memory.",
      focus: `Understand ${projectName}'s real product direction and turn the managed memory into project-specific specs, tasks, and current state.`,
      active_spec_ids: ["SPEC-001"],
      active_task_ids: ["TASK-001"],
      blocked_task_ids: [],
      next_action_hints: [
        "Inventory the repo's actual product goals, architecture notes, and existing spec/docs surfaces before editing the seed work.",
        "If legacy specs or design docs already exist, migrate or rewrite them into managed memory instead of implementing the seed tasks literally.",
        "Replace the seed current state and onboarding tasks once the real project direction is explicit.",
      ],
      updated_at: updatedAt,
      tags: ["seed", "adoption"],
    },
    `# Current State

This file is the explicit checkpoint for interrupted work. It should answer:

- what the project is trying to do right now
- which specs and tasks are active
- what should happen next
- what is blocked
- where a future human or agent should resume

## Narrative

Spec Embryo in this repository is a local-first memory and workflow layer for the real project. It is not the product being built here. The first slice after \`spm init\` should inventory the repo's real direction, migrate or rewrite existing planning docs into managed specs/tasks, and make current state explicit for the next human or agent.

## Notes

- \`spm ui\` already ships as part of the tool; the adopted repo does not need to implement a Spec Embryo UI.
- Seed spec/task files are onboarding scaffolding. Replace or archive them once real project-specific memory exists.
`,
  );
}

export function createSeedSpecTemplate(projectName: string, updatedAt: string): string {
  return serializeTomlFrontmatter(
    {
      doc_kind: "spec",
      id: "SPEC-001",
      title: "Adopt Spec Embryo memory for this repository",
      status: "active",
      summary: "Use managed specs, tasks, and current state to organize the real project without changing its product direction.",
      task_ids: ["TASK-001", "TASK-002", "TASK-003"],
      tags: ["adoption", "seed"],
      owner: "human-ai",
      updated_at: updatedAt,
    },
    `# Purpose

Spec Embryo in ${projectName} is project memory and workflow support. It helps humans and agents organize the real project's specs, tasks, handoffs, and current state inside the repo. It is not the product roadmap for a new copy of Spec Embryo.

# Goals

- Capture the repository's real product direction in managed specs and tasks.
- Inventory existing docs, specs, and planning notes before inventing new work.
- Improve continuity for interrupted human and agent work.
- Make the next active slice, blockers, and handoffs explicit in local files.

# Non-Goals For This Adoption Seed

- Do not implement Spec Embryo itself inside this repository unless this repo actually is Spec Embryo.
- Do not let the onboarding scaffold override the repository's real product direction.
- Do not plan Spec Embryo web UI, backend, or database work here; those ship with the tool and are outside the adopted repo's roadmap.
`,
  );
}

export function createSeedTaskTemplates(projectName: string, updatedAt: string): Array<{ name: string; content: string }> {
  return [
    {
      name: "TASK-001-inventory-the-real-project-direction-and-existing-docs.md",
      content: serializeTomlFrontmatter(
        {
          doc_kind: "task",
          id: "TASK-001",
          title: "Inventory the real project direction and existing docs",
          status: "in_progress",
          summary: "Identify what this repository is actually building, which planning docs already exist, and how they should map into managed memory.",
          spec_ids: ["SPEC-001"],
          depends_on: [],
          blocked_by: [],
          priority: 1,
          owner_role: "planner",
          created_at: updatedAt,
          tags: ["adoption", "seed"],
          updated_at: updatedAt,
        },
        `# Scope

- Determine ${projectName}'s real product direction, not Spec Embryo's.
- Find existing specs, design notes, TODO lists, or architecture docs that should influence the managed memory.
- Decide whether the next step is import, rewrite, or fresh spec authoring for the actual project.

# Done Looks Like

- The adopted repo's actual direction is written down explicitly.
- Relevant legacy docs or spec folders are identified.
- The next migration or authoring step is clear to another human or agent.
`,
      ),
    },
    {
      name: "TASK-002-create-or-import-the-first-real-project-spec.md",
      content: serializeTomlFrontmatter(
        {
          doc_kind: "task",
          id: "TASK-002",
          title: "Create or import the first real project spec",
          status: "todo",
          summary: "Replace the adoption scaffold with the first managed spec that reflects the repository's real product work.",
          spec_ids: ["SPEC-001"],
          depends_on: ["TASK-001"],
          blocked_by: [],
          priority: 1,
          owner_role: "planner",
          created_at: updatedAt,
          tags: ["adoption", "seed"],
          updated_at: updatedAt,
        },
        `# Scope

- Use import, rewrite, or fresh authoring to create the first managed spec about the real project.
- Preserve useful intent from legacy docs if they exist.
- Make it obvious that the resulting spec describes the adopted repo's product, not Spec Embryo.

# Done Looks Like

- At least one managed spec describes real project intent.
- The default adoption spec is replaced or clearly subordinated to real project memory.
`,
      ),
    },
    {
      name: "TASK-003-link-the-first-real-project-tasks-and-current-state.md",
      content: serializeTomlFrontmatter(
        {
          doc_kind: "task",
          id: "TASK-003",
          title: "Link the first real project tasks and current state",
          status: "todo",
          summary: "Create the first real execution tasks, connect them to the managed spec, and rewrite current state around actual repo work.",
          spec_ids: ["SPEC-001"],
          depends_on: ["TASK-002"],
          blocked_by: [],
          priority: 2,
          owner_role: "orchestrator",
          created_at: updatedAt,
          tags: ["adoption", "seed"],
          updated_at: updatedAt,
        },
        `# Scope

- Create the first linked tasks for the adopted repo's actual roadmap.
- Rewrite current state so focus, active work, and next actions reference real project work.
- Leave another human or agent with a trustworthy checkpoint after adoption.

# Done Looks Like

- Managed tasks point at real project execution, not the onboarding scaffold.
- \`current.md\` answers where work should resume in the actual project.
`,
      ),
    },
  ];
}

export function createCurrentStateTemplate(updatedAt: string): string {
  return serializeTomlFrontmatter(
    {
      doc_kind: "current-state",
      id: "CURRENT",
      title: "Current Project State",
      summary: "Describe the current project state here.",
      focus: "Describe the active focus here.",
      active_spec_ids: ["SPEC-001"],
      active_task_ids: ["TASK-001"],
      blocked_task_ids: [],
      next_action_hints: ["Describe the clearest next steps here."],
      updated_at: updatedAt,
      tags: ["template"],
    },
    `# Current State

This file is the explicit checkpoint for interrupted work.

## Narrative

Summarize the real current state, what changed recently, and where another human or agent should resume.

## Notes

- Capture explicit blockers and next actions.
`,
  );
}

export function createSpecDocTemplate(updatedAt: string): string {
  return serializeTomlFrontmatter(
    {
      doc_kind: "spec",
      id: "SPEC-001",
      title: "Spec title",
      status: "proposed",
      summary: "Short summary of the spec.",
      task_ids: ["TASK-001"],
      tags: ["template"],
      owner: "human-ai",
      updated_at: updatedAt,
    },
    `# Problem

Describe the problem this spec addresses.

# Goals

- List the intended outcomes.

# Non-Goals

- Capture what is intentionally out of scope.
`,
  );
}

export function createTaskDocTemplate(updatedAt: string): string {
  return serializeTomlFrontmatter(
    {
      doc_kind: "task",
      id: "TASK-001",
      title: "Task title",
      status: "todo",
      summary: "Short summary of the task.",
      spec_ids: ["SPEC-001"],
      depends_on: [],
      blocked_by: [],
      priority: 1,
      owner_role: "builder",
      created_at: updatedAt,
      tags: ["template"],
      updated_at: updatedAt,
    },
    `# Scope

Describe the concrete implementation scope.

# Done Looks Like

- The expected behavior is implemented and verified.
- The linked project memory stays consistent.
`,
  );
}

export function createSkillsReadme(): string {
  return `# Managed Skills

This folder is part of the managed Spec Embryo memory surface for the project.

Possible future contents:

- role definitions for planner / builder / reviewer agents
- prompt snippets or subtask recipes
- deterministic capability manifests
- skill docs another agent can inspect before continuing work
`;
}

export function createTemplateFiles(): Array<{ name: string; content: string }> {
  const placeholderTimestamp = "2026-04-02T00:00:00Z";
  return [
    {
      name: "spec-template.md",
      content: createSpecDocTemplate(placeholderTimestamp),
    },
    {
      name: "task-template.md",
      content: createTaskDocTemplate(placeholderTimestamp),
    },
    {
      name: "handoff-template.md",
      content: serializeTomlFrontmatter(
        {
          doc_kind: "handoff",
          id: "HANDOFF-PLACEHOLDER",
          title: "Checkpoint title",
          summary: "Short handoff summary.",
          handoff_kind: "checkpoint",
          created_at: placeholderTimestamp,
          active_task_ids: ["TASK-001"],
          related_spec_ids: ["SPEC-001"],
          author: "spec-embryo",
          updated_at: placeholderTimestamp,
          tags: ["handoff"],
        },
        `# Summary

Describe where the project was left.

## What Changed

- Itemize meaningful changes.

## Next Steps

- List the clearest next moves.

## Blockers

- Note anything that needs a decision or unblocking.
`,
      ),
    },
    {
      name: "current-state-template.md",
      content: createCurrentStateTemplate(placeholderTimestamp),
    },
  ];
}

export function inferProjectName(rootDir: string): string {
  return basename(rootDir);
}
