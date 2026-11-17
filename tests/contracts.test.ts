import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "../src/cli.ts";
import { runAgentCommand } from "../src/commands/agent.ts";
import { runDoctorCommand } from "../src/commands/doctor.ts";
import { runStatusCommand } from "../src/commands/status.ts";
import { initializeProject } from "../src/repository.ts";
import { STRUCTURED_OUTPUT_SCHEMA_VERSION } from "../src/services/contracts.ts";

describe("structured output contracts", () => {
  test("core JSON surfaces expose a schema version without hiding existing fields", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-contracts-"));

    try {
      await initializeProject(rootDir);

      const status = JSON.parse(await runStatusCommand(rootDir, parseArgs(["status", "--json"]))) as {
        schema_version: string;
        project: string;
      };
      const doctor = JSON.parse(await runDoctorCommand(rootDir, parseArgs(["doctor", "--json"]))) as {
        schema_version: string;
        summary: unknown;
      };
      const agent = JSON.parse(await runAgentCommand(rootDir, parseArgs(["agent", "--json"]))) as {
        schema_version: string;
        repo: unknown;
      };
      const snippet = JSON.parse(await runAgentCommand(rootDir, parseArgs(["agent", "snippet", "--json"]))) as {
        schema_version: string;
        snippetLines: string[];
      };

      expect(status.schema_version).toBe(STRUCTURED_OUTPUT_SCHEMA_VERSION);
      expect(status.project).toBeDefined();
      expect(doctor.schema_version).toBe(STRUCTURED_OUTPUT_SCHEMA_VERSION);
      expect(doctor.summary).toBeDefined();
      expect(agent.schema_version).toBe(STRUCTURED_OUTPUT_SCHEMA_VERSION);
      expect(agent.repo).toBeDefined();
      expect(snippet.schema_version).toBe(STRUCTURED_OUTPUT_SCHEMA_VERSION);
      expect(snippet.snippetLines.length).toBeGreaterThan(0);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
