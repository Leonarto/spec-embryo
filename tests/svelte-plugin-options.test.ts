import { describe, expect, test } from "bun:test";
import { buildSvelteVitePluginOptions, isPackagedSvelteApp } from "../web/svelte-plugin-options.js";

describe("svelte plugin options", () => {
  test("detects packaged installs from node_modules paths", () => {
    expect(
      isPackagedSvelteApp(
        "file:///Users/example/.bun/install/global/node_modules/@leonarto/spec-embryo/web/svelte.config.js",
      ),
    ).toBe(true);
    expect(
      isPackagedSvelteApp(
        "file:///Users/example/dev/spec-pm/web/svelte.config.js",
      ),
    ).toBe(false);
  });

  test("disables Svelte library prebundling for packaged installs only", () => {
    expect(
      buildSvelteVitePluginOptions(
        "file:///Users/example/.bun/install/global/node_modules/@leonarto/spec-embryo/web/svelte.config.js",
      ),
    ).toEqual({
      prebundleSvelteLibraries: false,
    });

    expect(
      buildSvelteVitePluginOptions(
        "file:///Users/example/dev/spec-pm/web/svelte.config.js",
      ),
    ).toEqual({});
  });
});
