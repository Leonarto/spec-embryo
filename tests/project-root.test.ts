import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveProjectRootFrom } from "../web/src/lib/server/project-root.ts";

describe("project root resolution", () => {
  test("uses the explicit project root when provided", () => {
    expect(resolveProjectRootFrom("/tmp/start", "/tmp/configured-root")).toBe("/tmp/configured-root");
  });

  test("walks up the tree until it finds .specpm/config.toml", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-root-"));

    try {
      await mkdir(join(rootDir, ".specpm"), { recursive: true });
      await mkdir(join(rootDir, "web", "src", "routes"), { recursive: true });
      await Bun.write(join(rootDir, ".specpm", "config.toml"), 'tool_version = "0.1.0"\n');

      expect(resolveProjectRootFrom(join(rootDir, "web", "src", "routes"))).toBe(rootDir);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("fails clearly when no project root can be found", () => {
    expect(() => resolveProjectRootFrom("/tmp")).toThrow(
      "Could not resolve the Spec Embryo project root. Set SPM_PROJECT_ROOT or run the UI from a repo with `.specpm/config.toml`.",
    );
  });
});
