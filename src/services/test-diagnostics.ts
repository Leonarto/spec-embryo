export interface TestDiagnosticArea {
  id: string;
  risk: "time" | "git" | "filesystem" | "process";
  files: string[];
  rerunCommand: string;
  mitigation: string;
}

export interface TestDiagnosticsBundle {
  areas: TestDiagnosticArea[];
  defaultRerunCommand: string;
}

export function buildTestDiagnosticsBundle(): TestDiagnosticsBundle {
  return {
    defaultRerunCommand: "bun test",
    areas: [
      {
        id: "git-worktree-state",
        risk: "git",
        files: ["tests/repository.test.ts", "tests/status.test.ts", "tests/resume-window.test.ts", "tests/harness-context.test.ts", "tests/harness-guard.test.ts", "tests/harness-receipts.test.ts"],
        rerunCommand: "bun test tests/repository.test.ts tests/status.test.ts tests/resume-window.test.ts tests/harness-context.test.ts tests/harness-guard.test.ts tests/harness-receipts.test.ts",
        mitigation: "Use per-test temporary repos, explicit git identity, and committed baselines before assertions.",
      },
      {
        id: "filesystem-locking",
        risk: "filesystem",
        files: ["tests/storage.test.ts", "tests/repository.test.ts", "tests/spec-answer-write.test.ts"],
        rerunCommand: "bun test tests/storage.test.ts tests/repository.test.ts tests/spec-answer-write.test.ts",
        mitigation: "Keep lock tests isolated under temporary directories and avoid sharing lock paths between tests.",
      },
      {
        id: "subprocess-and-packaged-ui",
        risk: "process",
        files: ["tests/backends.test.ts", "tests/harness-process.test.ts", "tests/harness-diagnostics.test.ts", "tests/harness-hooks.test.ts", "tests/hook-context.test.ts", "tests/harness-native.test.ts", "tests/harness-receipts.test.ts", "tests/ui.test.ts", "tests/vite-paths.test.ts"],
        rerunCommand: "bun test tests/backends.test.ts tests/harness-process.test.ts tests/harness-diagnostics.test.ts tests/harness-hooks.test.ts tests/hook-context.test.ts tests/harness-native.test.ts tests/harness-receipts.test.ts tests/ui.test.ts tests/vite-paths.test.ts",
        mitigation: "Use temporary local executable fixtures, bounded signal deadlines, and per-run artifacts; never call paid agent APIs.",
      },
    ],
  };
}

export function renderTestDiagnosticsBundle(bundle: TestDiagnosticsBundle): string {
  return [
    "Self-hosting test diagnostics",
    `Default rerun: ${bundle.defaultRerunCommand}`,
    "",
    "Sensitive areas:",
    ...bundle.areas.flatMap((area) => [
      `- ${area.id} [${area.risk}]`,
      `  files: ${area.files.join(", ")}`,
      `  rerun: ${area.rerunCommand}`,
      `  mitigation: ${area.mitigation}`,
    ]),
  ].join("\n");
}
