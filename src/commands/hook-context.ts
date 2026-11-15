import type { ParsedArgs } from "../cli.ts";
import { selectHarness } from "../services/harness-diagnostics.ts";
import { buildHookReferenceData, HOOK_WORKER_ENV, HOOK_WORKER_FLAG, hookContextFallback, runNativeHookContext, validHookWorkerToken } from "../services/harness-hook-context.ts";

export async function runHookContextCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  try {
    const provider = selectHarness(parsed.flags.get("harness"));
    if (!provider || parsed.positionals.length !== 2 || [...parsed.flags.keys()].some((key) => key !== "harness" && key !== HOOK_WORKER_FLAG)) {
      return JSON.stringify(hookContextFallback("Unsupported provider or handler options"));
    }
    if (parsed.flags.has(HOOK_WORKER_FLAG)) {
      const token = parsed.flags.get(HOOK_WORKER_FLAG);
      if (typeof token !== "string" || !validHookWorkerToken(token)) return JSON.stringify(hookContextFallback("Invalid private worker invocation"));
      delete process.env[HOOK_WORKER_ENV];
      try { return JSON.stringify(await buildHookReferenceData(rootDir)); }
      catch { return JSON.stringify({ worker_error: true }); }
    }
    return JSON.stringify(await runNativeHookContext(rootDir, provider));
  } catch { return JSON.stringify(hookContextFallback("Context could not be read")); }
}
