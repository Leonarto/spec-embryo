import { describe, expect, test } from "bun:test";
import { CLI_VERSION, compareCliVersions, readCliVersion } from "../src/services/version.ts";

describe("version service", () => {
  test("reads the CLI version from package.json", async () => {
    const packageJson = JSON.parse(await Bun.file(new URL("../package.json", import.meta.url)).text()) as {
      version: string;
    };

    await expect(readCliVersion()).resolves.toBe(packageJson.version);
    expect(CLI_VERSION).toBe(packageJson.version);
  });

  test("compares semantic-ish CLI versions", () => {
    expect(compareCliVersions("0.1.5", "0.1.4")).toBe(1);
    expect(compareCliVersions("0.1.5", "0.1.5")).toBe(0);
    expect(compareCliVersions("0.1.4", "0.1.5")).toBe(-1);
    expect(compareCliVersions("v1.0.0", "0.9.9")).toBe(1);
  });
});
