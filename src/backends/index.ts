import type { BackendName, ProjectConfig } from "../domain.ts";
import type { ResumeBackend } from "./base.ts";
import { DeterministicBackend } from "./deterministic.ts";
import { PromptBackend } from "./prompt.ts";
import { SubprocessBackend } from "./subprocess.ts";

class CodexBackend extends SubprocessBackend {
  name = "codex" as const;
}

class ClaudeBackend extends SubprocessBackend {
  name = "claude" as const;
}

export function resolveResumeBackend(name: BackendName, config: ProjectConfig): ResumeBackend {
  switch (name) {
    case "deterministic":
      return new DeterministicBackend();
    case "prompt":
      return new PromptBackend();
    case "codex":
      return new CodexBackend(config.backends.codex);
    case "claude":
      return new ClaudeBackend(config.backends.claude);
  }
}
