import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ParsedArgs } from "../src/cli.ts";
import { resolveUiLaunchConfig } from "../src/services/ui.ts";

function parsedWithFlags(flags: Map<string, string | boolean>): ParsedArgs {
  return {
    command: "ui",
    subcommand: undefined,
    positionals: ["ui"],
    flags,
  };
}

describe("ui service", () => {
  test("resolves the default launch config", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-ui-"));

    try {
      await mkdir(join(rootDir, "web"), { recursive: true });
      const config = await resolveUiLaunchConfig(rootDir, parsedWithFlags(new Map()));

      expect(config.host).toBe("127.0.0.1");
      expect(config.port).toBe(4173);
      expect(config.webDir.endsWith("/web")).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  test("rejects invalid ports", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-ui-"));

    try {
      await mkdir(join(rootDir, "web"), { recursive: true });

      await expect(
        resolveUiLaunchConfig(rootDir, parsedWithFlags(new Map([["port", "0"]]))),
      ).rejects.toThrow("`ui --port` must be a positive integer.");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
