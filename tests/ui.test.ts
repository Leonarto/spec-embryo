import { describe, expect, test } from "bun:test";
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
    const config = await resolveUiLaunchConfig(process.cwd(), parsedWithFlags(new Map()));

    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(4173);
    expect(config.webDir.endsWith("/web")).toBe(true);
  });

  test("rejects invalid ports", async () => {
    await expect(
      resolveUiLaunchConfig(process.cwd(), parsedWithFlags(new Map([["port", "0"]]))),
    ).rejects.toThrow("`ui --port` must be a positive integer.");
  });
});
