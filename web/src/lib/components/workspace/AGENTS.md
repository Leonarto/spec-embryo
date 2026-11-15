# AGENTS

- `WorkspaceShell.svelte` owns responsive navigation, rail preferences, and theme controls.
- In-place refresh waits for controlled DTO loading in P2; do not use `invalidateAll` as a failure-preserving transport.
- Rail width is 56/184 px at root 16; tablet forces compact and mobile uses header navigation.
- Preferences persist via validated `workspace-preferences.ts`; blocked storage must leave controls usable.
- Project/git data are typed props. No document parsing or source-of-truth state belongs in this shell.
