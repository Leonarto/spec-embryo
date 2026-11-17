import type { BackendName, HarnessInvocation, HarnessProtocol, ProjectConfig, ResumeContext } from "../domain.ts";

export interface BackendRunOptions {
  rootDir: string;
  config: ProjectConfig;
  json?: boolean;
  spawn?: boolean;
  maxContextBytes?: number;
  timeoutMs?: number;
  retainArtifacts?: boolean;
  cancellationSignal?: AbortSignal;
  protocol?: HarnessProtocol;
  sessionId?: string;
  onStdoutChunk?: (chunk: Uint8Array) => void;
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
