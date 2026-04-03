import { basename } from "node:path";
import { serializeTomlFrontmatter } from "./frontmatter.ts";
import { buildManagedPaths } from "./services/layout.ts";

export function createConfigToml(projectName: string, memoryDir = "docs/spm"): string {
  const managed = buildManagedPaths(memoryDir);
  return `
tool_version = "0.1.0"
project_name = ${JSON.stringify(projectName)}
memory_dir = ${JSON.stringify(managed.memoryDir)}
state_file = ${JSON.stringify(managed.stateFile)}
handoffs_dir = ${JSON.stringify(managed.handoffsDir)}
specs_dir = ${JSON.stringify(managed.specsDir)}
tasks_dir = ${JSON.stringify(managed.tasksDir)}
skills_dir = ${JSON.stringify(managed.skillsDir)}

[defaults]
resume_backend = "deterministic"

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

export function createCurrentStateTemplate(updatedAt: string): string {
  return serializeTomlFrontmatter(
    {
      doc_kind: "current-state",
      id: "CURRENT",
      title: "Current Project State",
      summary: "Building the first usable local-first Spec Embryo foundation.",
      focus: "Ship the first usable Spec Embryo workflow around init, status, resume, handoff, spec list, and task list.",
      active_spec_ids: ["SPEC-001"],
      active_task_ids: ["TASK-001", "TASK-002"],
      blocked_task_ids: [],
      next_action_hints: [
        "Verify init/status/resume flows against the seed repo files.",
        "Keep the file-backed storage layer stable before adding server mode.",
      ],
      updated_at: updatedAt,
      tags: ["v1", "seed"],
    },
    `# Current State

This file is the explicit checkpoint for interrupted work. It should answer:

- what the project is trying to do right now
- which specs and tasks are active
- what should happen next
- what is blocked
- where a future human or agent should resume

## Narrative

The immediate goal is to establish a strong deterministic core. The repo itself is the durable memory system, so the first slice prioritizes file formats, linking, validation, and resume ergonomics before any local server or remote backend exists.

## Notes

- Prompt-return mode is first-class to avoid unnecessary nested agent spawning.
- Subprocess agent backends are adapters, not the center of the product.
`,
  );
}

export function createSeedSpecTemplate(updatedAt: string): string {
  return serializeTomlFrontmatter(
    {
      doc_kind: "spec",
      id: "SPEC-001",
      title: "Establish the deterministic local-first core",
      status: "active",
      summary: "Define the file-backed, spec-first architecture and ship the first usable CLI workflow.",
      task_ids: ["TASK-001", "TASK-002", "TASK-003"],
      tags: ["v1", "foundation", "cli"],
      owner: "human-ai",
      updated_at: updatedAt,
    },
    `# Problem

AI-assisted software work loses continuity when the current state only lives in chat history or an external task tracker.

# Goals

- Keep repo memory local and readable.
- Make specs central and tasks explicitly linked.
- Support deterministic status and resume flows without any LLM.
- Leave room for prompt-return and subprocess backends later.

# Non-Goals For V1

- No web UI yet.
- No database dependency.
- No mandatory hosted service.
`,
  );
}

export function createSeedTaskTemplates(updatedAt: string): Array<{ name: string; content: string }> {
  return [
    {
      name: "TASK-001-bootstrap-cli.md",
      content: serializeTomlFrontmatter(
        {
          doc_kind: "task",
          id: "TASK-001",
          title: "Implement the Bun CLI and file-backed repository layer",
          status: "in_progress",
          summary: "Create the runnable CLI entrypoint, document parser, storage helpers, and core commands.",
          spec_ids: ["SPEC-001"],
          depends_on: [],
          blocked_by: [],
          priority: 1,
          owner_role: "builder",
          created_at: updatedAt,
          tags: ["v1", "cli"],
          updated_at: updatedAt,
        },
        `# Scope

Ship the initial commands and the document model so the project is already useful with local files alone.

# Done Looks Like

- \`init\`, \`status\`, \`resume\`, \`handoff\`, \`spec list\`, and \`task list\` exist
- repo memory files are created and validated deterministically
- the CLI can help a human or agent resume after interruption
`,
      ),
    },
    {
      name: "TASK-002-deterministic-resume.md",
      content: serializeTomlFrontmatter(
        {
          doc_kind: "task",
          id: "TASK-002",
          title: "Derive deterministic status, resume context, and next actions",
          status: "todo",
          summary: "Build the engine that links specs, tasks, current state, git data, blockers, and critical path.",
          spec_ids: ["SPEC-001"],
          depends_on: ["TASK-001"],
          blocked_by: [],
          priority: 1,
          owner_role: "planner",
          created_at: updatedAt,
          tags: ["v1", "engine"],
          updated_at: updatedAt,
        },
        `# Scope

Use explicit rules to compute what matters now, what is blocked, and what should happen next.

# Notes

Critical path can be simple in v1: longest unfinished dependency chain by declared task links.
`,
      ),
    },
    {
      name: "TASK-003-prompt-return-mode.md",
      content: serializeTomlFrontmatter(
        {
          doc_kind: "task",
          id: "TASK-003",
          title: "Add prompt-return mode and subprocess backend adapters",
          status: "todo",
          summary: "Return structured context and prompts when an AI is already calling the tool, with future-ready subprocess adapters.",
          spec_ids: ["SPEC-001"],
          depends_on: ["TASK-002"],
          blocked_by: [],
          priority: 2,
          owner_role: "orchestrator",
          created_at: updatedAt,
          tags: ["v1", "backends"],
          updated_at: updatedAt,
        },
        `# Scope

Prompt-return should be first-class. Spawning another AI should be opt-in rather than assumed.

# Notes

Adapters should keep backend-specific behavior behind a shared interface.
`,
      ),
    },
  ];
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
      content: createSeedSpecTemplate(placeholderTimestamp),
    },
    {
      name: "task-template.md",
      content: createSeedTaskTemplates(placeholderTimestamp)[0]!.content,
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
