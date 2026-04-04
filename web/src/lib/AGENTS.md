# AGENTS

Shared web-ui helpers and components live here.

- Put reusable view-only pieces here once multiple routes need them.
- Keep deterministic project-memory parsing in the root product services, not in this folder.
- Shared analytical controls should stay consistent across Specs, Gantt, and future detail views.
- Keep shared detail-page presentation helpers here once both spec and task routes need them.
- Shared dropdown controls should behave like overlays anchored to the trigger, not expand inline and reflow surrounding layout.
- Diagram renderers belong here too: treat Mermaid as a view-layer enhancement over fenced blocks parsed in root services, and keep non-Mermaid fenced blocks readable as code.
- If Mermaid theme logic grows, keep the token-to-Mermaid mapping in a helper here so dark/light behavior can be tested without browser-only route code.
- Theme helpers and color-mode controls should live here too so mode resolution, persistence keys, and shell selectors stay consistent across the workspace.
