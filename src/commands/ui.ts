import { spawn } from "node:child_process";
import { env, execPath } from "node:process";
import type { ParsedArgs } from "../cli.ts";
import { resolveUiLaunchConfig } from "../services/ui.ts";

export async function runUiCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  const launch = await resolveUiLaunchConfig(rootDir, parsed);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      execPath,
      ["run", "dev", "--", "--host", launch.host, "--port", String(launch.port)],
      {
        cwd: launch.webDir,
        stdio: "inherit",
        env: {
          ...env,
          SPM_PROJECT_ROOT: rootDir,
        },
      },
    );

    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (signal === "SIGINT" || signal === "SIGTERM" || code === 0) {
        resolve();
        return;
      }

      reject(new Error(`UI server exited with code ${code ?? "unknown"}.`));
    });
  });

  return "";
}
