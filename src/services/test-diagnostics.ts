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
        files: ["tests/storage.test.ts", "tests/repository.test.ts", "tests/spec-answer-write.test.ts", "tests/document-parse-memo.test.ts"],
        rerunCommand: "bun test tests/storage.test.ts tests/repository.test.ts tests/spec-answer-write.test.ts tests/document-parse-memo.test.ts",
        mitigation: "Keep lock tests isolated under temporary directories and avoid sharing lock paths between tests.",
      },
      {
        id: "subprocess-and-packaged-ui",
        risk: "process",
        files: ["tests/backends.test.ts", "tests/harness-process.test.ts", "tests/harness-diagnostics.test.ts", "tests/harness-hooks.test.ts", "tests/hook-context.test.ts", "tests/harness-native.test.ts", "tests/harness-receipts.test.ts", "tests/ui.test.ts", "tests/ui-build.test.ts", "tests/ui-launch.test.ts", "tests/ui-runtime.test.ts", "tests/vite-paths.test.ts"],
        rerunCommand: "bun test tests/backends.test.ts tests/harness-process.test.ts tests/harness-diagnostics.test.ts tests/harness-hooks.test.ts tests/hook-context.test.ts tests/harness-native.test.ts tests/harness-receipts.test.ts tests/ui.test.ts tests/ui-build.test.ts tests/ui-launch.test.ts tests/ui-runtime.test.ts tests/vite-paths.test.ts",
        mitigation: "Use temporary local executable fixtures, bounded signal deadlines, and per-run artifacts; never call paid agent APIs.",
      },
      {
        id: "installed-precompiled-ui",
        risk: "process",
        files: ["tests/ui-package.test.ts"],
        rerunCommand: "SPM_UI_PACKAGE_ROOT=/path/to/readonly-prefix/node_modules/@leonarto/spec-embryo bun test tests/ui-package.test.ts",
        mitigation: "Build explicitly, pack a fresh archive, install production dependencies into an owned prefix and make its node_modules read-only. Supply that package root explicitly; fixtures stay external. Runtime tests include the real 30-second drain deadline. Never install globally or measure acceptance in this functional gate.",
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
