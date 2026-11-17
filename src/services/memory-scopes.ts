import { relative } from "node:path";
import type { MemoryScopeName, ProjectContext } from "../domain.ts";
import { resolveProjectPaths } from "../paths.ts";

export interface MemoryScopesBundle {
  scopes: Array<{
    scope: MemoryScopeName;
    enabled: boolean;
    writePolicy: "read-only" | "read-write";
    dir: string;
    documentCount: number;
    documentKinds: string[];
    note: string;
  }>;
}

export function buildMemoryScopesBundle(context: ProjectContext): MemoryScopesBundle {
  const paths = resolveProjectPaths(context.rootDir, context.config);
  const activeSessionNotes = context.sessionNotes.filter((note) => !note.archivedAt);
  const activeOrgNotes = context.orgNotes.filter((note) => !note.archivedAt);
  const toRelative = (absolutePath: string): string => {
    const rel = relative(context.rootDir, absolutePath);
    return rel.length > 0 ? rel : ".";
  };

  return {
    scopes: [
      {
        scope: "repo",
        enabled: true,
        writePolicy: "read-write",
        dir: context.config.memoryDir,
        documentCount: 1 + context.specs.length + context.tasks.length + context.handoffs.length,
        documentKinds: ["current-state", "spec", "task", "handoff"],
        note: "Canonical project memory managed by Spec Embryo.",
      },
      {
        scope: "session",
        enabled: context.config.memoryScopes.session.enabled,
        writePolicy: context.config.memoryScopes.session.writePolicy,
        dir: toRelative(paths.sessionMemoryDir),
        documentCount: activeSessionNotes.length,
        documentKinds: ["memory-note"],
        note: "Fast-changing local notes that can later be consolidated into repo memory.",
      },
      {
        scope: "org",
        enabled: context.config.memoryScopes.org.enabled,
        writePolicy: context.config.memoryScopes.org.writePolicy,
        dir: toRelative(paths.orgMemoryDir),
        documentCount: activeOrgNotes.length,
        documentKinds: ["memory-note"],
        note: "Shared guidance scope intended for broader policy or reference material.",
      },
    ],
  };
}

export function renderMemoryScopesBundle(bundle: MemoryScopesBundle): string {
  return bundle.scopes
    .map(
      (scope) =>
        `${scope.scope} [${scope.enabled ? "enabled" : "disabled"} ${scope.writePolicy}] ${scope.dir}\n  docs: ${scope.documentCount}\n  kinds: ${scope.documentKinds.join(", ")}\n  note: ${scope.note}`,
    )
    .join("\n\n");
}
