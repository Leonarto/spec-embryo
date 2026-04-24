import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { buildViteFsAllowList } from "./vite-paths.ts";
import { buildPackagedViteOptimizeDeps } from "./svelte-plugin-options.js";

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: buildPackagedViteOptimizeDeps(),
  server: {
    fs: {
      allow: buildViteFsAllowList({
        projectRoot: process.env.SPM_PROJECT_ROOT,
      }),
    },
  },
});
