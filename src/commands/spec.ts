import type { ParsedArgs } from "../cli.ts";
import { flagValue } from "../cli.ts";
import { SPEC_STATUSES, isSpecStatus } from "../domain.ts";
import { createSpec, loadProjectContext, readProjectConfig, setSpecStatus } from "../repository.ts";
import { buildSpecImportBundle, renderSpecImportBundle } from "../services/spec-import.ts";

function parseCommaList(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export async function runSpecCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  if (parsed.subcommand === "create") {
    const title = flagValue(parsed, "title");
    const summary = flagValue(parsed, "summary");
    const status = flagValue(parsed, "status");

    if (!title || !summary) {
      throw new Error("`spec create` requires --title and --summary.");
    }

    if (status && !isSpecStatus(status)) {
      throw new Error(`Invalid spec status: ${status}. Expected one of ${SPEC_STATUSES.join(", ")}.`);
    }

    const spec = await createSpec(rootDir, {
      title,
      summary,
      status,
      taskIds: parseCommaList(flagValue(parsed, "task-ids")),
      tags: parseCommaList(flagValue(parsed, "tags")),
      owner: flagValue(parsed, "owner"),
    });

    if (parsed.flags.has("json")) {
      return JSON.stringify(spec, null, 2);
    }

    return `Created ${spec.id} [${spec.status}] in ${spec.filePath}`;
  }

  if (parsed.subcommand === "set-status") {
    const specId = parsed.positionals[2];
    const status = parsed.positionals[3];

    if (!specId || !status) {
      throw new Error("`spec set-status` requires <SPEC-ID> <status>.");
    }

    if (!isSpecStatus(status)) {
      throw new Error(`Invalid spec status: ${status}. Expected one of ${SPEC_STATUSES.join(", ")}.`);
    }

    const spec = await setSpecStatus(rootDir, specId, status);

    if (parsed.flags.has("json")) {
      return JSON.stringify(spec, null, 2);
    }

    return `Updated ${spec.id} to [${spec.status}] in ${spec.filePath}`;
  }

  if (parsed.subcommand === "import-prompt") {
    const source = flagValue(parsed, "source");
    if (!source) {
      throw new Error("`spec import-prompt` requires --source <folder>.");
    }

    const maxCharsRaw = flagValue(parsed, "max-chars-per-file");
    const maxCharsPerFile = maxCharsRaw ? Number.parseInt(maxCharsRaw, 10) : undefined;
    const config = await readProjectConfig(rootDir);
    const bundle = await buildSpecImportBundle(rootDir, source, {
      instructions: flagValue(parsed, "instructions"),
      maxCharsPerFile: Number.isFinite(maxCharsPerFile) ? maxCharsPerFile : undefined,
      targetMemoryDir: config.memoryDir,
    });

    if (parsed.flags.has("json")) {
      return JSON.stringify(bundle, null, 2);
    }

    return renderSpecImportBundle(bundle);
  }

  if (parsed.subcommand !== "list") {
    throw new Error("Supported spec commands in v1 are `spec list`, `spec create`, `spec set-status`, and `spec import-prompt`.");
  }

  const context = await loadProjectContext(rootDir);
  const statusFilter = flagValue(parsed, "status");
  const specs = context.specs.filter((spec) => (statusFilter ? spec.status === statusFilter : true));

  if (parsed.flags.has("json")) {
    return JSON.stringify(specs, null, 2);
  }

  if (specs.length === 0) {
    return "No specs found.";
  }

  return specs
    .map((spec) => `${spec.id} [${spec.status}] ${spec.title}\n  tasks: ${spec.taskIds.join(", ") || "none"}\n  ${spec.summary}`)
    .join("\n\n");
}
