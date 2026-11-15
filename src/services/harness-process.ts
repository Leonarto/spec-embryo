import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import type { HarnessInvocation } from "../domain.ts";

export const MAX_HARNESS_STDOUT_BYTES = 1048576;
const TERMINATION_GRACE_MS = 2000;
const CLOSE_OBSERVATION_MS = 1000;

export function failedInvocation(type: NonNullable<HarnessInvocation["error"]>["type"], message: string): HarnessInvocation {
  return { state: "failed", exit_code: null, signal: null, output: "", stdout_bytes: 0,
    stdout_truncated: false, error: { type, message }, warnings: [] };
}

export function invocationExitCode(invocation: HarnessInvocation): number {
  if (invocation.state === "completed") return 0;
  if (invocation.error?.type === "usage" || invocation.error?.type === "precondition") return 2;
  if (invocation.state === "timed_out") return 124;
  if (invocation.state === "cancelled") return invocation.cancellation_signal === "SIGINT" ? 130 : 143;
  return 1;
}

export function cancelledInvocation(signal: "SIGINT" | "SIGTERM"): HarnessInvocation {
  return { state: "cancelled", exit_code: null, signal: null, cancellation_signal: signal,
    output: "", stdout_bytes: 0, stdout_truncated: false, warnings: [],
    error: { type: "cancelled", message: `Harness cancelled by ${signal} before launch.` } };
}

export interface HarnessProcessOptions {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  captureStdout: boolean;
  timeoutMs?: number;
  // The override exists for deterministic platform-contract tests, not CLI flags.
  platform?: NodeJS.Platform;
  cancellationSignal?: AbortSignal;
}

export async function runHarnessProcess(options: HarnessProcessOptions): Promise<HarnessInvocation> {
  if (options.cancellationSignal?.aborted) return cancelledInvocation(options.cancellationSignal.reason === "SIGINT" ? "SIGINT" : "SIGTERM");
  const platform = options.platform ?? process.platform;
  const groups = platform === "darwin" || platform === "linux";
  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(options.command, options.args, { cwd: options.cwd,
      env: { ...process.env, ...options.env }, detached: groups,
      stdio: options.captureStdout ? ["inherit", "pipe", "inherit"] : "inherit" });
  } catch (error) {
    return failedInvocation("spawn", error instanceof Error ? error.message : String(error));
  }

  return new Promise<HarnessInvocation>((resolve) => {
    let settled = false;
    let closed = false;
    let exitCode: number | null = null;
    let exitSignal: NodeJS.Signals | null = null;
    let spawnError: Error | undefined;
    let stopReason: "timeout" | "SIGINT" | "SIGTERM" | undefined;
    let received = 0;
    let retained = 0;
    const chunks: Buffer[] = [];
    let startedAt: number | undefined;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
    let graceTimer: ReturnType<typeof setTimeout> | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    let groupPoll: ReturnType<typeof setInterval> | undefined;

    const groupExists = (): boolean => {
      if (!child.pid) return false;
      try { process.kill(groups ? -child.pid : child.pid, 0); return true; }
      catch (error) { return (error as NodeJS.ErrnoException).code !== "ESRCH"; }
    };
    const send = (signal: NodeJS.Signals) => {
      if (!child.pid) return;
      try { process.kill(groups ? -child.pid : child.pid, signal); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") spawnError ??= error as Error;
      }
    };
    const finish = (unknown = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer); clearTimeout(graceTimer); clearTimeout(closeTimer); clearInterval(groupPoll);
      process.off("SIGINT", onInt); process.off("SIGTERM", onTerm);
      options.cancellationSignal?.removeEventListener("abort", onAbort);
      const decoder = new StringDecoder("utf8");
      // write without end drops an incomplete trailing code point at the byte cap.
      const output = decoder.write(Buffer.concat(chunks, retained));
      const invocation: HarnessInvocation = {
        state: "completed", exit_code: spawnError && startedAt === undefined ? null : exitCode, signal: exitSignal, output,
        stdout_bytes: received, stdout_truncated: received > MAX_HARNESS_STDOUT_BYTES, warnings: [],
      };
      if (unknown) {
        invocation.state = "unknown";
        invocation.error = { type: "unknown", message: "Could not confirm closure of the controlled process tree." };
        invocation.warnings.push(groups
          ? stopReason ? "Process group closure was not confirmed within the termination deadline."
            : "Child streams closed while its process group still has members; background work was not terminated."
          : "This platform supports best-effort direct-child cancellation; process-tree closure is unverified.");
        if (stopReason) invocation.warnings.push(`Termination was requested by ${stopReason}.`);
        child.stdout?.destroy();
        child.unref();
      } else if (stopReason) {
        invocation.state = stopReason === "timeout" ? "timed_out" : "cancelled";
        if (stopReason !== "timeout") invocation.cancellation_signal = stopReason;
        invocation.error = { type: stopReason === "timeout" ? "timeout" : "cancelled",
          message: stopReason === "timeout" ? `Harness exceeded timeout of ${options.timeoutMs} ms.` : `Harness cancelled by ${stopReason}.` };
      } else if (spawnError || exitCode !== 0 || exitSignal) {
        invocation.state = "failed";
        invocation.error = { type: spawnError && startedAt === undefined ? "spawn" : "process",
          message: spawnError?.message ?? `Harness exited with ${exitSignal ?? `code ${exitCode ?? "unknown"}`}.` };
      }
      resolve(invocation);
    };
    const maybeFinishStop = () => {
      if (!closed || !stopReason) return;
      if (!groups) { finish(true); return; }
      if (!groupExists()) finish();
    };
    const stop = (reason: "timeout" | "SIGINT" | "SIGTERM") => {
      if (settled || stopReason) return;
      stopReason = reason;
      clearTimeout(timeoutTimer);
      send(reason === "timeout" ? "SIGTERM" : reason);
      groupPoll = setInterval(maybeFinishStop, 25);
      graceTimer = setTimeout(() => {
        if (settled) return;
        send("SIGKILL");
        closeTimer = setTimeout(() => {
          if (closed && groups && !groupExists()) finish();
          else finish(true);
        }, CLOSE_OBSERVATION_MS);
        maybeFinishStop();
      }, TERMINATION_GRACE_MS);
      maybeFinishStop();
    };
    const onInt = () => stop("SIGINT");
    const onTerm = () => stop("SIGTERM");
    const onAbort = () => stop(options.cancellationSignal?.reason === "SIGINT" ? "SIGINT" : "SIGTERM");
    if (options.cancellationSignal) options.cancellationSignal.addEventListener("abort", onAbort, { once: true });
    else { process.on("SIGINT", onInt); process.on("SIGTERM", onTerm); }

    child.stdout?.on("data", (chunk: Buffer) => {
      received += chunk.length;
      const remaining = MAX_HARNESS_STDOUT_BYTES - retained;
      if (remaining > 0) {
        const kept = Buffer.from(chunk.subarray(0, remaining));
        chunks.push(kept); retained += kept.length;
      }
    });
    child.stdout?.on("error", (error) => { spawnError = error; });
    child.on("spawn", () => {
      startedAt = performance.now();
      if (options.timeoutMs !== undefined && !stopReason && !settled) {
        const schedule = () => {
          const remaining = options.timeoutMs! - (performance.now() - startedAt!);
          if (remaining <= 0) stop("timeout");
          else timeoutTimer = setTimeout(schedule, Math.min(remaining, 2147483647));
        };
        schedule();
      }
    });
    child.on("error", (error) => { spawnError = error; });
    child.on("close", (code, signal) => {
      closed = true; exitCode = code; exitSignal = signal;
      if (stopReason) maybeFinishStop();
      else if (groups && groupExists()) finish(true);
      else finish();
    });
  });
}
