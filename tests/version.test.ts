import { describe, expect, test } from "bun:test";
import { readCliVersion } from "../src/services/version.ts";

describe("version service", () => {
  test("reads the CLI version from package.json", async () => {
    const packageJson = JSON.parse(await Bun.file(new URL("../package.json", import.meta.url)).text()) as {
      version: string;
    };

    await expect(readCliVersion()).resolves.toBe(packageJson.version);
  });
});
