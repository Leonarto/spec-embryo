import { spawn } from "node:child_process";
import { env, execPath } from "node:process";
import { join } from "node:path";
import type { ParsedArgs } from "../cli.ts";
import { productionUiEnvironment, resolveNodeRuntime, resolveUiLaunchConfig } from "../services/ui.ts";
import { validateUiArtifacts } from "../services/ui-artifacts.ts";

export async function runUiCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  let child: ReturnType<typeof spawn> | undefined;
  let cancelled = false;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const stop = (signal: NodeJS.Signals) => {
    cancelled = true;
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    child.kill(signal);
    deadline ??= setTimeout(() => child?.kill("SIGKILL"), 35_000);
    deadline.unref();
  };
  const interrupt = () => stop("SIGINT");
  const terminate = () => stop("SIGTERM");
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  try {
    const launch = await resolveUiLaunchConfig(rootDir, parsed);
    const started = performance.now();
    const manifest = launch.dev ? undefined : await validateUiArtifacts(launch.packageRoot);
    const validationMs = performance.now() - started;
    const node = launch.dev ? undefined : await resolveNodeRuntime();
    if (cancelled) return "";
    console.log(launch.dev ? "Starting Spec Embryo UI in DEV mode (live compilation)." : `Starting precompiled Spec Embryo UI with ${node!.executable} (${node!.version}); artifacts verified in ${validationMs.toFixed(1)} ms.`);
    await new Promise<void>((resolve, reject) => {
      let ready = false;
      let startupError: string | undefined;
      const runtimeEnv = launch.dev ? { ...env, SPM_PROJECT_ROOT: launch.projectRoot, SPM_UI_BIND_HOST: launch.host, SPM_UI_REGISTRY: launch.registryFile ?? "" } : {
        ...productionUiEnvironment(env, launch.projectRoot),
        SPM_UI_BIND_HOST: launch.host, SPM_UI_REGISTRY: launch.registryFile ?? "",
        SPM_UI_CONFIG: JSON.stringify({ host: launch.host, port: launch.port, buildId: manifest!.buildId, version: manifest!.package.version }),
      };
      child = spawn(launch.dev ? execPath : node!.executable, launch.dev ? ["run", "dev", "--", "--host", launch.host, "--port", String(launch.port), "--strictPort"] : [join(launch.webDir, "runtime/server.mjs")], {
        cwd: launch.dev ? launch.webDir : launch.projectRoot,
        stdio: launch.dev ? "inherit" : ["inherit", "inherit", "inherit", "ipc"],
        env: runtimeEnv,
      });
      child.on("message", (value: unknown) => {
        if (!value || typeof value !== "object") return;
        const message = value as Record<string, unknown>;
        if (message.type === "spm-ui-error" && typeof message.message === "string") startupError = message.message;
        if (message.type === "spm-ui-ready" && manifest && !ready && !cancelled && message.buildId === manifest?.buildId && message.version === manifest.package.version && typeof message.origin === "string") {
          ready = true;
          console.log(`Spec Embryo UI ready at ${message.origin}/ (build ${manifest.buildId})`);
        }
      });
      child.once("error", reject);
      child.once("close", (code, signal) => {
        if (deadline) clearTimeout(deadline);
        if (code === 0 && (ready || launch.dev || cancelled) || cancelled && (signal === "SIGINT" || signal === "SIGTERM")) resolve();
        else reject(new Error(startupError ?? `UI server exited ${signal ? `with signal ${signal}` : `with code ${code ?? "unknown"}`}${!ready && !launch.dev ? " before readiness" : ""}.`));
      });
      if (cancelled) stop("SIGTERM");
    });
    return "";
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", terminate);
    if (deadline) clearTimeout(deadline);
  }
}
