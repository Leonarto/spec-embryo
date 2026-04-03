import * as universal from '../entries/pages/_layout.ts.js';
import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.D7afiZH9.js","_app/immutable/chunks/MzZg4pNA.js","_app/immutable/chunks/ZzqBUCr2.js","_app/immutable/chunks/CFKVnMbq.js","_app/immutable/chunks/ufaIZEM8.js","_app/immutable/chunks/BkIFycXM.js","_app/immutable/chunks/DoROT1y7.js","_app/immutable/chunks/nF9KPWdH.js","_app/immutable/chunks/DMQ9bdyH.js"];
export const stylesheets = ["_app/immutable/assets/0.CFMweHLo.css"];
export const fonts = [];
