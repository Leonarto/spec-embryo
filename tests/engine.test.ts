import { describe, expect, test } from "bun:test";
import type { ProjectContext } from "../src/domain.ts";
import { buildResumeContext, deriveChangedItems, deriveStatusSnapshot } from "../src/engine.ts";

const context: ProjectContext = {
  rootDir: "/tmp/spec-embryo",
  config: {
    toolVersion: "0.1.0",
    projectName: "spec-embryo",
    memoryDir: "docs/spm",
    stateFile: "docs/spm/current.md",
    handoffsDir: "docs/spm/handoffs",
    specsDir: "docs/spm/specs",
    tasksDir: "docs/spm/tasks",
    skillsDir: "docs/spm/skills",
    defaults: {
      resumeBackend: "deterministic",
    },
    backends: {
      deterministic: { enabled: true },
      prompt: { enabled: true },
      codex: { enabled: false },
      claude: { enabled: false },
    },
  },
  currentState: {
    docKind: "current-state",
    id: "CURRENT",
    title: "Current Project State",
    summary: "Build the deterministic core.",
    focus: "Ship status and resume.",
    activeSpecIds: ["SPEC-001"],
    activeTaskIds: ["TASK-002"],
    blockedTaskIds: [],
    nextActionHints: ["Keep docs in sync."],
    body: "State body",
    filePath: "/tmp/spec-embryo/docs/spm/current.md",
    tags: [],
    updatedAt: "2026-04-02T00:00:00Z",
  },
  specs: [
    {
      docKind: "spec",
      id: "SPEC-001",
      title: "Foundation",
      summary: "Project foundation",
      status: "active",
      taskIds: ["TASK-001", "TASK-002"],
      tags: [],
      body: "Spec body",
      filePath: "/tmp/spec-embryo/docs/spm/specs/SPEC-001.md",
    },
  ],
  tasks: [
    {
      docKind: "task",
      id: "TASK-001",
      title: "Bootstrap",
      summary: "Bootstrap repo",
      status: "done",
      specIds: ["SPEC-001"],
      dependsOn: [],
      blockedBy: [],
      priority: 1,
      tags: [],
      body: "Task 1",
      filePath: "/tmp/spec-embryo/docs/spm/tasks/TASK-001.md",
    },
    {
      docKind: "task",
      id: "TASK-002",
      title: "Build engine",
      summary: "Engine task",
      status: "in_progress",
      specIds: ["SPEC-001"],
      dependsOn: ["TASK-001"],
      blockedBy: [],
      priority: 1,
      tags: [],
      body: "Task 2",
      filePath: "/tmp/spec-embryo/docs/spm/tasks/TASK-002.md",
    },
    {
      docKind: "task",
      id: "TASK-003",
      title: "Prompt backend",
      summary: "Prompt backend task",
      status: "todo",
      specIds: ["SPEC-001"],
      dependsOn: ["TASK-002"],
      blockedBy: [],
      priority: 2,
      tags: [],
      body: "Task 3",
      filePath: "/tmp/spec-embryo/docs/spm/tasks/TASK-003.md",
    },
  ],
  handoffs: [],
  git: {
    available: true,
    branch: "main",
    shortStatus: [],
    lastCommit: "abc123 Initial commit",
    dirty: false,
  },
};

describe("engine", () => {
  test("derives ready and blocked tasks", () => {
    const snapshot = deriveStatusSnapshot(context);
    expect(snapshot.activeTaskIds).toEqual(["TASK-002"]);
    expect(snapshot.readyTasks).toHaveLength(0);
    expect(snapshot.blockedTasks).toHaveLength(1);
    expect(snapshot.blockedTasks[0]?.task.id).toBe("TASK-003");
  });

  test("builds resume context with next actions", () => {
    const resume = buildResumeContext(context);
    expect(resume.activeTasks).toHaveLength(1);
    expect(resume.nextActions[0]).toContain("Unblock TASK-003");
    expect(resume.criticalPath.map((task) => task.id)).toContain("TASK-003");
  });

  test("treats review tasks as active unfinished work", () => {
    const reviewContext: ProjectContext = {
      ...context,
      currentState: {
        ...context.currentState,
        activeTaskIds: [],
      },
      tasks: context.tasks.map((task) =>
        task.id === "TASK-002"
          ? {
              ...task,
              status: "review",
            }
          : task,
      ),
    };

    const snapshot = deriveStatusSnapshot(reviewContext);
    const resume = buildResumeContext(reviewContext);

    expect(snapshot.activeTaskIds).toEqual(["TASK-002"]);
    expect(snapshot.reviewTasks).toHaveLength(1);
    expect(snapshot.reviewTasks[0]?.task.id).toBe("TASK-002");
    expect(resume.nextActions.some((action) => action.includes("Review TASK-002"))).toBe(true);
  });

  test("derives changed spec, task, and current-state items from git status", () => {
    const changedContext: ProjectContext = {
      ...context,
      git: {
        ...context.git,
        dirty: true,
        shortStatus: [
          " M docs/spm/specs/SPEC-001.md",
          " M docs/spm/tasks/TASK-002.md",
          " M docs/spm/current.md",
          "?? README.md",
        ],
      },
    };

    const changedItems = deriveChangedItems(changedContext);
    expect(changedItems.map((item) => item.kind)).toEqual(["spec", "task", "current-state", "other"]);
    expect(changedItems[0]?.id).toBe("SPEC-001");
    expect(changedItems[1]?.id).toBe("TASK-002");
    expect(changedItems[2]?.kind).toBe("current-state");
  });

  test("includes changed managed docs in next actions when available", () => {
    const changedContext: ProjectContext = {
      ...context,
      git: {
        ...context.git,
        dirty: true,
        shortStatus: [" M docs/spm/specs/SPEC-001.md"],
      },
    };

    const resume = buildResumeContext(changedContext);
    expect(resume.changedItems).toHaveLength(1);
    expect(resume.nextActions.some((action) => action.includes("SPEC-001"))).toBe(true);
  });
});
