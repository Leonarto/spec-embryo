import { fileURLToPath } from "node:url";

export function isPackagedSvelteApp(configUrl = import.meta.url) {
  return fileURLToPath(configUrl).includes("/node_modules/");
}

export function buildSvelteVitePluginOptions(configUrl = import.meta.url) {
  if (!isPackagedSvelteApp(configUrl)) {
    return {};
  }

  return {
    // Packaged `spm ui` runs the Svelte app from global node_modules. In that layout,
    // vite-plugin-svelte's dev prebundling path can mis-treat app source as dependency
    // library code and fail to load the generated virtual CSS modules.
    prebundleSvelteLibraries: false,
  };
}

export function buildPackagedViteOptimizeDeps(configUrl = import.meta.url) {
  if (!isPackagedSvelteApp(configUrl)) {
    return undefined;
  }

  return {
    // Packaged `spm ui` can resolve Mermaid's `dayjs` dependency from the global
    // Bun install tree. Force both through Vite optimization so browser imports
    // get the CommonJS default interop wrapper instead of raw `/@fs/.../dayjs.min.js`.
    include: ["mermaid", "dayjs"],
  };
}
