import type { BackendName, ProjectConfig, ResumeContext } from "../domain.ts";

export interface BackendRunOptions {
  rootDir: string;
  config: ProjectConfig;
  json?: boolean;
  spawn?: boolean;
  maxContextBytes?: number;
}

export interface BackendRunResult {
  text: string;
  json?: unknown;
}

export interface ResumeBackend {
  name: BackendName;
  run(context: ResumeContext, options: BackendRunOptions): Promise<BackendRunResult>;
}
