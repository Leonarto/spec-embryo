import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, realpath, stat } from "node:fs/promises";
import { delimiter, resolve } from "node:path";
import { StringDecoder } from "node:string_decoder";
import type { HarnessProvider } from "../domain.ts";

export const HARNESS_PROBE_TIMEOUT_MS = 2000;
export const HARNESS_PROBE_MAX_BYTES = 65536;
export type HarnessProbeArgs = ["--version"] | ["--help"] | ["exec", "--help"] | ["exec", "resume", "--help"];
export interface HarnessProbeResult {
  status: "available" | "timeout" | "error";
  output: string;
  bytes_received: number;
  truncated: boolean;
  exit_code: number | null;
}

export async function resolveHarnessExecutable(provider: HarnessProvider, rootDir: string,
  searchPath = process.env.PATH ?? ""): Promise<string | null> {
  const suffixes = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
  for (const directory of searchPath.split(delimiter)) {
    for (const suffix of suffixes) {
      const candidate = resolve(rootDir, directory || ".", `${provider}${suffix}`);
      try {
        if (!(await stat(candidate)).isFile()) continue;
        await access(candidate, process.platform === "win32" ? constants.F_OK : constants.X_OK);
        return await realpath(candidate);
      } catch { /* Continue PATH lookup; no command is executed here. */ }
    }
  }
  return null;
}

export async function runHarnessProbe(executable: string, args: HarnessProbeArgs, rootDir: string): Promise<HarnessProbeResult> {
  if (!["--version", "--help", "exec --help", "exec resume --help"].includes(args.join(" "))) {
    return { status: "error", output: "Probe arguments are not allowlisted.", bytes_received: 0, truncated: false, exit_code: null };
  }
  const groups = process.platform === "darwin" || process.platform === "linux";
  return new Promise((resolveResult) => {
    let child: ReturnType<typeof spawn>;
    let settled = false;
    let received = 0;
    let retained = 0;
    const chunks: Buffer[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (status: HarnessProbeResult["status"], code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (status !== "available" && child) {
        kill(); child.stdout?.destroy(); child.stderr?.destroy(); child.unref();
      }
      const decoder = new StringDecoder("utf8");
      resolveResult({ status, output: decoder.write(Buffer.concat(chunks, retained)), bytes_received: received,
        truncated: received > HARNESS_PROBE_MAX_BYTES, exit_code: code });
    };
    const kill = () => {
      if (!child?.pid) return;
      try { process.kill(groups ? -child.pid : child.pid, "SIGKILL"); } catch {}
    };
    try {
      child = spawn(executable, args, { cwd: rootDir, shell: false, detached: groups,
        stdio: ["ignore", "pipe", "pipe"] });
      const collect = (chunk: Buffer) => {
        received += chunk.length;
        const remaining = HARNESS_PROBE_MAX_BYTES - retained;
        if (remaining > 0) {
          const kept = Buffer.from(chunk.subarray(0, remaining));
          chunks.push(kept); retained += kept.length;
        }
      };
      child.stdout?.on("data", collect); child.stderr?.on("data", collect);
      child.stdout?.on("error", () => { kill(); finish("error", null); });
      child.stderr?.on("error", () => { kill(); finish("error", null); });
      child.on("error", () => finish("error", null));
      child.on("close", (code, signal) => {
        if (settled) return;
        if (groups && child.pid) {
          try { process.kill(-child.pid, 0); kill(); finish("error", code); return; }
          catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ESRCH") { kill(); finish("error", code); return; }
          }
        }
        finish(code === 0 && !signal ? "available" : "error", code);
      });
      // Deadline covers launch and output activity, with no activity-based resets.
      timer = setTimeout(() => {
        kill(); child.stdout?.destroy(); child.stderr?.destroy(); child.unref();
        finish("timeout", null);
      }, HARNESS_PROBE_TIMEOUT_MS);
    } catch { finish("error", null); }
  });
}
