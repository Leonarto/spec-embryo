import { describe, expect, test } from "bun:test";
import { parseTomlFrontmatter, serializeTomlFrontmatter } from "../src/frontmatter.ts";

describe("frontmatter", () => {
  test("parses TOML frontmatter with arrays and body", () => {
    const input = `+++
doc_kind = "spec"
id = "SPEC-001"
task_ids = ["TASK-001", "TASK-002"]
+++

# Body

Hello.
`;
    const parsed = parseTomlFrontmatter(input);
    expect(parsed.body).toContain("Hello.");
    expect((parsed.attributes as Record<string, unknown>).id).toBe("SPEC-001");
  });

  test("serializes and parses back simple frontmatter", () => {
    const serialized = serializeTomlFrontmatter(
      {
        doc_kind: "task",
        id: "TASK-001",
        title: "Test task",
        priority: 1,
        spec_ids: ["SPEC-001"],
      },
      "# Example\n\nBody",
    );

    const parsed = parseTomlFrontmatter(serialized);
    expect((parsed.attributes as Record<string, unknown>).title).toBe("Test task");
    expect(parsed.body).toContain("Body");
  });
});
