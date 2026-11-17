import adapter from "@sveltejs/adapter-node";
import { buildSvelteVitePluginOptions } from "./svelte-plugin-options.js";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  vitePlugin: buildSvelteVitePluginOptions(),
  kit: {
    version: { name: process.env.SPM_UI_BUILD_IDENTITY ?? "uncertified" },
    adapter: adapter({ out: "build", precompress: true, envPrefix: "SPM_SERVER_" }),
  },
};

export default config;
