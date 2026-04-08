import adapter from "@sveltejs/adapter-auto";
import { buildSvelteVitePluginOptions } from "./svelte-plugin-options.js";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  vitePlugin: buildSvelteVitePluginOptions(),
  kit: {
    adapter: adapter(),
  },
};

export default config;
