import type { ParsedArgs } from "../cli.ts";
import { flagValue } from "../cli.ts";
import { loadProjectContext } from "../repository.ts";
import { buildMemoryContextPack, renderContextPack } from "../services/context-pack.ts";
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
  MEMORY_QUERY_STATUSES,
  renderMemoryQueryBundle,
  type MemoryQueryDocKind,
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
  if (parsed.subcommand === "query") {
    const context = await loadProjectContext(rootDir);
    const bundle = buildMemoryQueryBundle(context, {
      text: flagValue(parsed, "text"),
      docKind: parseDocKind(flagValue(parsed, "doc-kind")),
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

  throw new Error("Supported memory commands in this slice are `memory query`, `memory links`, `memory brief`, and `memory pack`.");
}
