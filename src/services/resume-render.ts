export const DEFAULT_MAX_CONTEXT_BYTES = 32768;
export const MIN_CONTEXT_BYTES = 4096;
export const MAX_CONTEXT_BYTES = 1048576;

export function utf8Prefix(value: string, maxBytes: number): string {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.length <= maxBytes) return value;
  let end = Math.max(0, maxBytes);
  while (end > 0 && (bytes[end]! & 0xc0) === 0x80) end -= 1;
  return bytes.subarray(0, end).toString("utf8");
}

export interface ResumeRenderInput {
  stablePrefix: string;
  fullTail: string;
  projectName: string;
  focus: string;
  summary: string;
  blocked: Array<{ id: string; title: string; unmet_dependencies: string[] }>;
  references: Array<{ kind: string; ref: string }>;
  warnings: string[];
  interruptionWindow?: { since: string; resolvedSince: string | null; available: boolean; changedFiles: string[]; commits: string[] };
}

export function boundResumeText(input: ResumeRenderInput, maxBytes = DEFAULT_MAX_CONTEXT_BYTES): {
  tail: string; warnings: string[];
} {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < MIN_CONTEXT_BYTES || maxBytes > MAX_CONTEXT_BYTES) {
    throw new Error(`max-context-bytes must be an integer between ${MIN_CONTEXT_BYTES} and ${MAX_CONTEXT_BYTES}.`);
  }
  const available = maxBytes - Buffer.byteLength(input.stablePrefix, "utf8") - 2;
  if (Buffer.byteLength(input.fullTail, "utf8") <= available) return { tail: input.fullTail, warnings: input.warnings };

  const truncationWarning = `Context text truncated/offloaded to ${maxBytes} UTF-8 bytes; full data: spm resume --backend prompt --json.`;
  const warnings = [...input.warnings, truncationWarning];
  const seen = new Set<string>();
  const refs = input.references.filter((entry) => {
    const key = `${entry.kind}:${entry.ref}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const payload = {
    project_name: utf8Prefix(input.projectName, 256),
    focus: utf8Prefix(input.focus, 512),
    blocked_task_count: input.blocked.length,
    ...(input.interruptionWindow ? { interruption_window: {
      since: utf8Prefix(input.interruptionWindow.since, 128),
      resolvedSince: input.interruptionWindow.resolvedSince,
      available: input.interruptionWindow.available,
      committed_files: input.interruptionWindow.changedFiles.length,
      commits: input.interruptionWindow.commits.length,
    } } : {}),
    blocked_tasks: [] as Array<{ id: string; title: string; unmet_dependencies: string[] }>,
    blocked_tasks_omitted: input.blocked.length,
    summary: "",
    references: [] as Array<{ kind: string; ref: string }>,
    references_omitted: refs.length,
  };
  // A bounded warning preamble reserves room for identity and useful references.
  const preamble = ["Warnings:", ...input.warnings.slice(0, 2).map((warning) => `- ${utf8Prefix(warning, 128)}`),
    ...(input.warnings.length > 2 ? [`- ${input.warnings.length - 2} additional warnings; see full JSON.`] : []),
    `- ${truncationWarning}`, "Expansion: spm resume --backend prompt --json", "", "Compact structured context:"].join("\n");
  const render = () => `${preamble}\n${JSON.stringify(payload, null, 2)}`;
  while (Buffer.byteLength(render(), "utf8") > available) {
    payload.focus = utf8Prefix(payload.focus, Math.floor(Buffer.byteLength(payload.focus, "utf8") / 2));
    payload.project_name = utf8Prefix(payload.project_name, Math.floor(Buffer.byteLength(payload.project_name, "utf8") / 2));
  }
  for (const task of input.blocked) {
    const item = { id: utf8Prefix(task.id, 128), title: utf8Prefix(task.title, 128),
      unmet_dependencies: task.unmet_dependencies.slice(0, 4).map((ref) => utf8Prefix(ref, 128)) };
    payload.blocked_tasks.push(item);
    payload.blocked_tasks_omitted -= 1;
    // Leave room for an expansion reference even when there are many blockers.
    if (Buffer.byteLength(render(), "utf8") > available - 512) {
      payload.blocked_tasks.pop();
      payload.blocked_tasks_omitted += 1;
      break;
    }
  }
  payload.summary = utf8Prefix(input.summary, 256);
  if (Buffer.byteLength(render(), "utf8") > available - 256) payload.summary = "";
  for (const ref of refs) {
    payload.references.push(ref);
    payload.references_omitted -= 1;
    if (Buffer.byteLength(render(), "utf8") > available) {
      payload.references.pop();
      payload.references_omitted += 1;
      break;
    }
  }
  return { tail: render(), warnings };
}
