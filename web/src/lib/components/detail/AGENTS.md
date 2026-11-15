# AGENTS

Shared canonical and inspector detail presentation.

- TaskDetail/SpecDetail accept root detail DTOs; never fetch or derive domain metrics here.
- Page and inspector share solid tokens/body typography. Preserve page content/order and the canonical question POST; inspector questions remain a full-page link until guarded editing.
- `RelationWindow` caps inspector collections at100 (Spec tasks total across groups); canonical data remains complete until the transport checkpoint.
- Inspector anchors retain the document/Mermaid subtree through section or mode changes. NotFound serves route404 and local missing states.
