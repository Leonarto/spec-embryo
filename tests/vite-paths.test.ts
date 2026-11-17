import { describe, expect, test } from "bun:test";
import { buildViteFsAllowList, findNodeModulesRoot } from "../web/vite-paths.ts";

describe("vite packaged fs allow list", () => {
  test("finds the node_modules root for packaged scoped installs", () => {
    expect(
      findNodeModulesRoot("/Users/example/.bun/install/global/node_modules/@leonarto/spec-embryo"),
    ).toBe("/Users/example/.bun/install/global/node_modules");
  });

  test("returns undefined when the path is not inside node_modules", () => {
    expect(findNodeModulesRoot("/Users/example/dev/spec-embryo")).toBeUndefined();
  });

  test("builds an allow list for packaged installs plus the target project root", () => {
    const allowList = buildViteFsAllowList({
      configUrl: "file:///Users/example/.bun/install/global/node_modules/@leonarto/spec-embryo/web/vite.config.ts",
      projectRoot: "/Users/example/dev/nina-gg",
    });

    expect(allowList).toEqual([
      "/Users/example/.bun/install/global/node_modules/@leonarto/spec-embryo",
      "/Users/example/.bun/install/global/node_modules",
      "/Users/example/dev/nina-gg",
    ]);
  });

  test("keeps local-repo dev allow lists narrow", () => {
    const allowList = buildViteFsAllowList({
      configUrl: "file:///Users/example/dev/spec-embryo/web/vite.config.ts",
      projectRoot: "/Users/example/dev/nina-gg",
    });

    expect(allowList).toEqual([
      "/Users/example/dev/spec-embryo",
      "/Users/example/dev/nina-gg",
    ]);
  });
});
