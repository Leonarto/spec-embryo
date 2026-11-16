# AGENTS

- `server.mjs` owns the production HTTP listener, bounded port fallback, exact Host authority and IPC readiness/shutdown.
- Import only the public adapter `build/handler.js`, after setting the fixed origin; keep project reads in existing request services.
- Stop the server before rebuilding. No compiler, project preload, proxy trust or package-tree writes belong in this runtime.
