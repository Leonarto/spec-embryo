Spec Embryo 0.4.0 adds a compact local UI with task/spec tables, persistent inspectors, guarded spec-question answers and an extracted Timeline. The normal UI serves verified precompiled Node assets; live compilation is available through explicit `--dev`.

A single local server can view multiple existing SPM repositories. Register names/directories through `spm portfolio register` or the Repositories screen, then switch through the selector. Selection is request-local and URL-carried, with expected workspace identity guards on background reads and answer submissions. Browser registration requires a literal loopback bind; CLI registration remains available for network-bound servers.

The release also includes the reviewed Codex/Claude harness interoperability and deterministic project-memory improvements accumulated since0.3.1. Personal hooks are not automatically installed.

Known limits: the historical large-fixture latency budgets remain unmet; the cold, interaction and retention acceptance sequence is incomplete. Host contention was not quantified. Payload bounds and package functionality have separate evidence; this release does not claim performance acceptance. Real200% zoom remains user-deferred, and screen-reader sessions were unavailable.
