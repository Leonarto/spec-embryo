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
  spec-embryo init [--force] [--home docs] [--standalone]
  spm init [--force] [--home docs] [--standalone]
  spm reshape [--home docs] [--dry-run]
  spm doctor [--json]
  spm status [--json]
  spm current show [--json]
  spm current set [--focus "..."] [--summary "..."] [--active-spec-ids SPEC-001,SPEC-002] [--active-task-ids TASK-006,TASK-013] [--blocked-task-ids TASK-003] [--next-action-hints "hint one || hint two"] [--clear-active-spec-ids] [--clear-active-task-ids] [--clear-blocked-task-ids] [--clear-next-action-hints] [--json]
  spm ui [--host 127.0.0.1] [--port 4173]
  spm resume [--backend deterministic|prompt|codex|claude] [--json] [--spawn]
  spm handoff [--title "Checkpoint"] [--note "extra note"]
  spm agents check [--json]
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

Aliases:
  - \`spm\` is the primary short command
  - \`spec-embryo\` is the long-form name

Core ideas:
  - local-first and file-backed
  - deterministic-first parsing and status derivation
  - prompt-return mode for already-running agents
  - subprocess agent backends as optional adapters
`;
}
