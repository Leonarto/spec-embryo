import type { BackendName, HarnessInvocation, ProjectConfig, ResumeContext } from "../domain.ts";

export interface BackendRunOptions {
  rootDir: string;
  config: ProjectConfig;
  json?: boolean;
  spawn?: boolean;
  maxContextBytes?: number;
  timeoutMs?: number;
  retainArtifacts?: boolean;
  cancellationSignal?: AbortSignal;
}

export interface BackendRunResult {
  text: string;
  json?: unknown;
  invocation?: HarnessInvocation;
  exitCode?: number;
}

export interface ResumeBackend {
  name: BackendName;
  run(context: ResumeContext, options: BackendRunOptions): Promise<BackendRunResult>;
}
