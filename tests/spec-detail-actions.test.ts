import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createSpec, initializeProject } from "../src/repository.ts";
import { actions } from "../web/src/routes/specs/[specId]/+page.server.ts";

describe("spec detail actions", () => {
  let rootDir: string | undefined;
  const originalProjectRoot = process.env.SPM_PROJECT_ROOT;

  afterEach(async () => {
    process.env.SPM_PROJECT_ROOT = originalProjectRoot;
    if (rootDir) {
      await rm(rootDir, { recursive: true, force: true });
      rootDir = undefined;
    }
  });

  test("answers open questions from the spec detail action", async () => {
    rootDir = await mkdtemp(join(tmpdir(), "spec-embryo-spec-action-"));
    process.env.SPM_PROJECT_ROOT = rootDir;

    await initializeProject(rootDir);
    const spec = await createSpec(rootDir, {
      title: "Spec action answer flow",
      summary: "Submit answered open questions from the detail route.",
    });
    const raw = await readFile(spec.filePath, "utf8");
    await writeFile(spec.filePath, `${raw.trim()}\n\n## Open Questions\n\n- Should this save from the detail page?\n`);

    const formData = new FormData();
    formData.append("question", "Should this save from the detail page?");
    formData.append("answer", "Yes. The UI should write the answer back into the spec and return continuation guidance.");

    const result = await actions.answerOpenQuestions({
      params: { specId: spec.id },
      request: new Request("http://example.test/specs/action", {
        method: "POST",
        body: formData,
      }),
    } as never);
    const nextRaw = await readFile(spec.filePath, "utf8");

    expect("success" in result && result.success).toBe(true);
    if ("success" in result && result.success) {
      expect(result.evaluation.status).toBe("ready-for-follow-up");
      expect(result.savedCount).toBe(1);
    }
    expect(nextRaw).toContain("## Resolved Decisions");
    expect(nextRaw).toContain("Should this save from the detail page?");
    expect(nextRaw).not.toContain("## Open Questions");
  });
});
