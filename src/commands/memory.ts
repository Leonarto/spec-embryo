import type { ParsedArgs } from "../cli.ts";
import { flagValue, hasFlag } from "../cli.ts";
import { loadProjectContext } from "../repository.ts";
import {
  buildMemoryConsolidationBundle,
  MEMORY_CONSOLIDATION_TARGETS,
  renderMemoryConsolidationBundle,
  type MemoryConsolidationTarget,
} from "../services/memory-consolidation.ts";
import { buildMemoryContextPack, renderContextPack } from "../services/context-pack.ts";
import {
  buildCreateMemoryNoteBundle,
  buildUpdateMemoryNoteBundle,
  MEMORY_NOTE_SCOPES,
  renderMemoryNoteMutationBundle,
  type MemoryNoteScope,
} from "../services/memory-note.ts";
import {
  buildMemoryEvalBundle,
  MEMORY_EVAL_SUITES,
  renderMemoryEvalBundle,
  type MemoryEvalSuite,
} from "../services/memory-evals.ts";
import { buildMemoryScopesBundle, renderMemoryScopesBundle } from "../services/memory-scopes.ts";
import {
  buildMemoryBriefBundle,
  MEMORY_BRIEF_PROFILES,
  renderMemoryBriefBundle,
  type MemoryBriefProfile,
} from "../services/memory-brief.ts";
import { buildMemoryLinkGraph, buildMemoryLinksBundle, renderMemoryLinksBundle } from "../services/memory-links.ts";
import {
  buildMemoryQueryBundle,
  MEMORY_QUERY_DOC_KINDS,
  MEMORY_QUERY_SCOPES,
  MEMORY_QUERY_STATUSES,
  renderMemoryQueryBundle,
  type MemoryQueryDocKind,
  type MemoryQueryScope,
  type MemoryQueryStatus,
} from "../services/memory-query.ts";

function parseCommaList(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function parsePositiveInteger(value: string | undefined, flagName: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`\`${flagName}\` must be a positive integer.`);
  }

  return parsed;
}

function parseEvalSuites(value: string | undefined): MemoryEvalSuite[] {
  if (!value) {
    return [...MEMORY_EVAL_SUITES];
  }

  const suites = parseCommaList(value);
  if (suites.length === 0) {
    return [...MEMORY_EVAL_SUITES];
  }

  const invalid = suites.filter((suite) => !MEMORY_EVAL_SUITES.includes(suite as MemoryEvalSuite));
  if (invalid.length > 0) {
    throw new Error(`Invalid memory eval suite: ${invalid[0]}. Expected one of ${MEMORY_EVAL_SUITES.join(", ")}.`);
  }

  return suites as MemoryEvalSuite[];
}

function parseDocKind(value: string | undefined): MemoryQueryDocKind | undefined {
  if (!value) {
    return undefined;
  }

  if (MEMORY_QUERY_DOC_KINDS.includes(value as MemoryQueryDocKind)) {
    return value as MemoryQueryDocKind;
  }

  throw new Error(
    `Invalid memory doc kind: ${value}. Expected one of ${MEMORY_QUERY_DOC_KINDS.join(", ")}.`,
  );
}

function parseStatus(value: string | undefined): MemoryQueryStatus | undefined {
  if (!value) {
    return undefined;
  }

  if (MEMORY_QUERY_STATUSES.includes(value as MemoryQueryStatus)) {
    return value as MemoryQueryStatus;
  }

  throw new Error(
    `Invalid memory status: ${value}. Expected one of ${MEMORY_QUERY_STATUSES.join(", ")}.`,
  );
}

function parseScope(value: string | undefined): MemoryQueryScope | undefined {
  if (!value) {
    return undefined;
  }

  if (MEMORY_QUERY_SCOPES.includes(value as MemoryQueryScope)) {
    return value as MemoryQueryScope;
  }

  throw new Error(
    `Invalid memory scope: ${value}. Expected one of ${MEMORY_QUERY_SCOPES.join(", ")}.`,
  );
}

function parseMemoryNoteScope(value: string | undefined): MemoryNoteScope | undefined {
  if (!value) {
    return undefined;
  }

  if (MEMORY_NOTE_SCOPES.includes(value as MemoryNoteScope)) {
    return value as MemoryNoteScope;
  }

  throw new Error(
    `Invalid memory note scope: ${value}. Expected one of ${MEMORY_NOTE_SCOPES.join(", ")}.`,
  );
}

function parseConsolidationTarget(value: string | undefined): MemoryConsolidationTarget | undefined {
  if (!value) {
    return undefined;
  }

  if (MEMORY_CONSOLIDATION_TARGETS.includes(value as MemoryConsolidationTarget)) {
    return value as MemoryConsolidationTarget;
  }

  throw new Error(
    `Invalid memory consolidation target: ${value}. Expected one of ${MEMORY_CONSOLIDATION_TARGETS.join(", ")}.`,
  );
}

function parseBriefProfile(value: string | undefined): MemoryBriefProfile | undefined {
  if (!value) {
    return undefined;
  }

  if (MEMORY_BRIEF_PROFILES.includes(value as MemoryBriefProfile)) {
    return value as MemoryBriefProfile;
  }

  throw new Error(
    `Invalid memory brief profile: ${value}. Expected one of ${MEMORY_BRIEF_PROFILES.join(", ")}.`,
  );
}

function parseOptionalBooleanFlag(
  parsed: ParsedArgs,
  positiveFlag: string,
  negativeFlag: string,
): boolean | undefined {
  const include = parsed.flags.has(positiveFlag);
  const exclude = parsed.flags.has(negativeFlag);

  if (include && exclude) {
    throw new Error(`Use either \`--${positiveFlag}\` or \`--${negativeFlag}\`, not both.`);
  }

  if (include) {
    return true;
  }

  if (exclude) {
    return false;
  }

  return undefined;
}

export async function runMemoryCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  if (parsed.subcommand === "note") {
    const noteAction = parsed.positionals[2];

    if (noteAction === "create") {
      const scope = parseMemoryNoteScope(flagValue(parsed, "scope"));
      if (!scope) {
        throw new Error("`memory note create` requires `--scope session|org`.");
      }

      const bundle = await buildCreateMemoryNoteBundle(rootDir, {
        scope,
        title: flagValue(parsed, "title") ?? "",
        summary: flagValue(parsed, "summary"),
        tags: parseCommaList(flagValue(parsed, "tags")),
        expiresAt: flagValue(parsed, "expires-at"),
        body: flagValue(parsed, "body"),
      });

      if (parsed.flags.has("json")) {
        return JSON.stringify(bundle, null, 2);
      }

      return renderMemoryNoteMutationBundle(bundle);
    }

    if (noteAction === "update") {
      const noteId = parsed.positionals[3];
      const bundle = await buildUpdateMemoryNoteBundle(rootDir, {
        noteId: noteId ?? "",
        title: flagValue(parsed, "title"),
        summary: flagValue(parsed, "summary"),
        tags: parsed.flags.has("tags") ? parseCommaList(flagValue(parsed, "tags")) : undefined,
        expiresAt: flagValue(parsed, "expires-at"),
        clearExpiresAt: hasFlag(parsed, "clear-expires-at"),
        body: flagValue(parsed, "body"),
      });

      if (parsed.flags.has("json")) {
        return JSON.stringify(bundle, null, 2);
      }

      return renderMemoryNoteMutationBundle(bundle);
    }

    throw new Error("Supported note commands are `memory note create` and `memory note update`.");
  }

  if (parsed.subcommand === "query") {
    const context = await loadProjectContext(rootDir);
    const bundle = buildMemoryQueryBundle(context, {
      text: flagValue(parsed, "text"),
      docKind: parseDocKind(flagValue(parsed, "doc-kind")),
      scope: parseScope(flagValue(parsed, "scope")),
      status: parseStatus(flagValue(parsed, "status")),
      tags: parseCommaList(flagValue(parsed, "tag")),
      id: flagValue(parsed, "id"),
      linkedTo: flagValue(parsed, "linked-to"),
      neighborOf: flagValue(parsed, "neighbor-of"),
      limit: parsePositiveInteger(flagValue(parsed, "limit"), "--limit"),
    });

    if (parsed.flags.has("json")) {
      return JSON.stringify(bundle, null, 2);
    }

    return renderMemoryQueryBundle(bundle);
  }

  if (parsed.subcommand === "links") {
    const docId = parsed.positionals[2];
    if (!docId) {
      throw new Error("`memory links` requires <DOC-ID>.");
    }

    const context = await loadProjectContext(rootDir);
    const graph = buildMemoryLinkGraph(context);
    const bundle = buildMemoryLinksBundle(graph, docId, {
      depth: parsePositiveInteger(flagValue(parsed, "depth"), "--depth"),
    });

    if (parsed.flags.has("json")) {
      return JSON.stringify(bundle, null, 2);
    }

    return renderMemoryLinksBundle(bundle);
  }

  if (parsed.subcommand === "brief") {
    const context = await loadProjectContext(rootDir);
    const bundle = buildMemoryBriefBundle(context, {
      id: flagValue(parsed, "id"),
      specId: flagValue(parsed, "spec"),
      taskId: flagValue(parsed, "task"),
      text: flagValue(parsed, "text"),
      scope: parseScope(flagValue(parsed, "scope")),
      includeNeighbors: parseOptionalBooleanFlag(parsed, "include-neighbors", "no-neighbors"),
      includeCurrent: parseOptionalBooleanFlag(parsed, "include-current", "no-current"),
      includeHandoffs: parseOptionalBooleanFlag(parsed, "include-handoffs", "no-handoffs"),
      profile: parseBriefProfile(flagValue(parsed, "profile")),
    });

    if (parsed.flags.has("json")) {
      return JSON.stringify(bundle, null, 2);
    }

    return renderMemoryBriefBundle(bundle);
  }

  if (parsed.subcommand === "pack") {
    const context = await loadProjectContext(rootDir);
    const bundle = buildMemoryContextPack(context, {
      id: flagValue(parsed, "id"),
      specId: flagValue(parsed, "spec"),
      taskId: flagValue(parsed, "task"),
      text: flagValue(parsed, "text"),
      scope: parseScope(flagValue(parsed, "scope")),
      includeNeighbors: parseOptionalBooleanFlag(parsed, "include-neighbors", "no-neighbors"),
      includeCurrent: parseOptionalBooleanFlag(parsed, "include-current", "no-current"),
      includeHandoffs: parseOptionalBooleanFlag(parsed, "include-handoffs", "no-handoffs"),
      profile: parseBriefProfile(flagValue(parsed, "profile")),
    });

    if (parsed.flags.has("json")) {
      return JSON.stringify(bundle, null, 2);
    }

    return renderContextPack(bundle);
  }

  if (parsed.subcommand === "scopes") {
    const context = await loadProjectContext(rootDir);
    const bundle = buildMemoryScopesBundle(context);

    if (parsed.flags.has("json")) {
      return JSON.stringify(bundle, null, 2);
    }

    return renderMemoryScopesBundle(bundle);
  }

  if (parsed.subcommand === "consolidate") {
    const noteId = parsed.positionals[2];
    if (!noteId) {
      throw new Error("`memory consolidate` requires <NOTE-ID>.");
    }

    const bundle = await buildMemoryConsolidationBundle(rootDir, {
      noteId,
      apply: hasFlag(parsed, "apply"),
      target: parseConsolidationTarget(flagValue(parsed, "target")),
      title: flagValue(parsed, "title"),
      keepSource: hasFlag(parsed, "keep-source"),
    });

    if (parsed.flags.has("json")) {
      return JSON.stringify(bundle, null, 2);
    }

    return renderMemoryConsolidationBundle(bundle);
  }

  if (parsed.subcommand === "eval") {
    const bundle = await buildMemoryEvalBundle(rootDir, parseEvalSuites(flagValue(parsed, "suite")));

    if (parsed.flags.has("json")) {
      return JSON.stringify(bundle, null, 2);
    }

    return renderMemoryEvalBundle(bundle);
  }

  throw new Error("Supported memory commands in this slice are `memory note`, `memory query`, `memory links`, `memory brief`, `memory pack`, `memory scopes`, `memory consolidate`, and `memory eval`.");
}
