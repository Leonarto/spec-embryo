# AGENTS

- One inspector controller owns URL/history, request identity, focus and transitions; content components only render shared detail DTOs.
- Keep the same host/content DOM across docking changes. Modal mode owns only its inert/trap changes; docked mode never traps.
- Data intention excludes inspect/section. History proof is memory-only; preserve unrelated PageState fields.
- Questions remain a canonical link until the guarded question slice; never introduce a second mutation endpoint.
