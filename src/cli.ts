import { relative } from "node:path";
import type { BackendName } from "./domain.ts";

export interface ParsedArgs {
  command: string | undefined;
  subcommand: string | undefined;
  positionals: string[];
  flags: Map<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const flags = new Map<string, string | boolean>();
  const positionals: string[] = [];
  let index = 0;

  while (index < argv.length) {
    const arg = argv[index]!;

    if (arg.startsWith("--")) {
      const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
      if (inlineValue !== undefined) {
        flags.set(rawKey, inlineValue);
        index += 1;
        continue;
      }

      const next = argv[index + 1];
      if (next && !next.startsWith("--")) {
        flags.set(rawKey, next);
        index += 2;
        continue;
      }

      flags.set(rawKey, true);
      index += 1;
      continue;
    }

    positionals.push(arg);
    index += 1;
  }

  return {
    command: positionals[0],
    subcommand: positionals[1],
    positionals,
    flags,
  };
}

export function flagValue(parsed: ParsedArgs, name: string): string | undefined {
  const value = parsed.flags.get(name);
  return typeof value === "string" ? value : undefined;
}

export function hasFlag(parsed: ParsedArgs, name: string): boolean {
  return parsed.flags.has(name);
}

export function backendFlag(parsed: ParsedArgs, fallback: BackendName): BackendName {
  const value = flagValue(parsed, "backend");
  if (value === "prompt" || value === "deterministic" || value === "codex" || value === "claude") {
    return value;
  }

  return fallback;
}

export function formatPath(rootDir: string, absolutePath: string): string {
  const rel = relative(rootDir, absolutePath);
  return rel.length > 0 ? rel : ".";
}

export function helpText(): string {
  return `spec-embryo

Usage:
  spec-embryo --version
  spm --version
  spec-embryo init [--force] [--home docs] [--standalone] [--json]
  spm init [--force] [--home docs] [--standalone] [--profile library|service|frontend-app|infra] [--json]
  spm import legacy --source docs [--apply] [--json]
  spm version
  spm reshape [--home docs] [--dry-run]
  spm doctor [--verbose] [--harness codex|claude] [--json]
  spm agent [brief|snippet] [--harness codex|claude] [--json]
  spm agent hook-context --harness codex|claude
  spm status [--json]
  spm current show [--json]
  spm current set [--focus "..."] [--summary "..."] [--active-spec-ids SPEC-001,SPEC-002] [--active-task-ids TASK-006,TASK-013] [--blocked-task-ids TASK-003] [--next-action-hints "hint one || hint two"] [--clear-active-spec-ids] [--clear-active-task-ids] [--clear-blocked-task-ids] [--clear-next-action-hints] [--json]
  spm ui [--host 127.0.0.1] [--port 4173] [--registry path] [--dev]
  spm resume [--backend deterministic|prompt|codex|claude] [--since commit] [--max-context-bytes 32768] [--json] [--spawn] [--timeout-ms milliseconds] [--retain-artifacts] [--protocol codex-jsonl|claude-json|claude-stream-json] [--record] [--session-ref receipt-uuid]
  spm handoff [--title "Checkpoint"] [--note "extra note"]
  spm handoff --from-run receipt-uuid [--apply] [--note "observed checks"] [--json]
  spm hooks install [--events commit,merge,ci,release] [--json]
  spm hooks plan [--event commit|merge|ci|release] [--json]
  spm hooks plan --harness codex|claude [--json]
  spm hooks install --harness codex|claude [--apply] [--json]
  spm hooks remove --harness codex|claude [--apply] [--json]
  spm agents check [--json]
  spm memory note create --scope session|org --title "..." [--summary "..."] [--tags a,b] [--expires-at 2026-05-01T12:00:00.000Z] [--body "..."] [--json]
  spm memory note update <NOTE-ID> [--title "..."] [--summary "..."] [--tags a,b] [--expires-at 2026-05-01T12:00:00.000Z | --clear-expires-at] [--body "..."] [--json]
  spm memory note archive <NOTE-ID> [--reason "..."] [--json]
  spm memory note restore <NOTE-ID> [--json]
  spm memory note list [--scope session|org] [--include-archived] [--limit 20] [--json]
  spm memory query [--text "..."] [--doc-kind spec|task|handoff|current-state|memory-note] [--scope session|repo|org] [--status ...] [--tag ui,adoption] [--id SPEC-001] [--linked-to DOC-ID] [--neighbor-of DOC-ID] [--rank default|recent|active] [--limit 20] [--json]
  spm memory links <DOC-ID> [--depth 1|2] [--json]
  spm memory brief (--id DOC-ID | --spec SPEC-ID | --task TASK-ID | --text "...") [--scope session|repo|org] [--rank default|recent|active] [--include-neighbors|--no-neighbors] [--include-current|--no-current] [--include-handoffs|--no-handoffs] [--profile implementation|review|migration] [--json]
  spm memory pack (--id DOC-ID | --spec SPEC-ID | --task TASK-ID | --text "...") [--scope session|repo|org] [--rank default|recent|active] [--include-neighbors|--no-neighbors] [--include-current|--no-current] [--include-handoffs|--no-handoffs] [--profile implementation|review|migration] [--json]
  spm memory scopes [--json]
  spm memory consolidate <NOTE-ID> [--apply] [--target handoff] [--title "..."] [--keep-source] [--json]
  spm memory eval [--suite retrieval,pack,consolidation,injection] [--json]
  spm nexus setup [--apply] [--command gitnexus] [--root-agents-mode reference-only|scoped] [--json]
  spm portfolio register [path] [--id project-id] [--name "Project Name"] [--tags a,b] [--registry path] [--json]
  spm portfolio list [--registry path] [--json]
  spm portfolio status [--registry path] [--json]
  spm portfolio search <text> [--registry path] [--json]
  spm portfolio link <PROJECT-ID> [--depends-on other-id] [--related other-id] [--milestones milestone] [--registry path] [--json]
  spm profile list [--json]
  spm profile show <library|service|frontend-app|infra> [--json]
  spm release plan [--json]
  spm release notes [--json]
  spm release recommend [--json]
  spm spec list [--status active]
  spm spec create --title "..." --summary "..." [--status proposed] [--task-ids TASK-001,TASK-002] [--tags foundation,cli] [--owner human-ai] [--json]
  spm spec set-status <SPEC-ID> <proposed|active|paused|done|archived> [--json]
  spm spec import-prompt --source docs/specs [--instructions "..."] [--max-chars-per-file 1800] [--json]
  spm task list [--status todo] [--spec SPEC-001]
  spm task create --title "..." --summary "..." --spec-ids SPEC-001[,SPEC-002] [--status todo|in_progress|blocked|review|done|cancelled] [--priority 2] [--depends-on TASK-001] [--blocked-by TASK-002] [--owner-role builder] [--tags cli,self-hosting] [--json]
  spm task set-status <TASK-ID> <todo|in_progress|blocked|review|done|cancelled> [--json]
  spm task archive <TASK-ID> [--reason "..."] [--json]
  spm task archive-done --older-than 7d [--reason "..."] [--json]
  spm task archive-cancelled --older-than 7d [--reason "..."] [--json]
  spm task restore <TASK-ID> [--json]
  spm tests diagnose [--json]

Aliases:
  - \`spm\` is the primary short command
  - \`spec-embryo\` is the long-form name

Core ideas:
  - local-first and file-backed
  - deterministic-first parsing and status derivation
  - prompt-return mode for already-running agents
  - subprocess agent backends as optional adapters
  - JSON outputs expose schema_version for machine consumers
`;
}
