import type { ParsedArgs } from "../cli.ts";
import { flagValue } from "../cli.ts";
import { loadProjectContext } from "../repository.ts";
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

  throw new Error("Supported memory commands in this slice are `memory query` and `memory links`.");
}
