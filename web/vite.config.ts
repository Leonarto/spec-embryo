import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { buildViteFsAllowList } from "./vite-paths.ts";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    fs: {
      allow: buildViteFsAllowList({
        projectRoot: process.env.SPM_PROJECT_ROOT,
      }),
    },
  },
});
