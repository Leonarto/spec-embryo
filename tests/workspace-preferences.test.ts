import { describe, expect, test } from "bun:test";
import { isWorkspaceRoute, parseWorkspacePreferences, workspaceRouteLabel } from "../web/src/lib/workspace-preferences.ts";

describe("workspace preferences", () => {
  test("validates versioned storage and defaults corrupt values without throwing", () => {
    for (const value of [null, undefined, "", "{", "null", "[]", '"expanded"', '{"version":2,"rail":"expanded"}', '{"rail":"expanded"}', '{"version":1,"rail":"unknown"}']) {
      expect(parseWorkspacePreferences(value)).toEqual({ version: 1, rail: "collapsed" });
    }
    expect(parseWorkspacePreferences('{"version":1,"rail":"expanded","future":true}')).toEqual({ version: 1, rail: "expanded" });
    expect(parseWorkspacePreferences('{"version":1,"rail":"collapsed"}')).toEqual({ version: 1, rail: "collapsed" });
  });
  test("canonical detail routes activate their parent without matching similar prefixes", () => {
    expect(isWorkspaceRoute("/tasks/TASK-001", "/tasks")).toBe(true);
    expect(isWorkspaceRoute("/specs/SPEC-001", "/specs")).toBe(true);
    expect(isWorkspaceRoute("/tasks-archive", "/tasks")).toBe(false);
    expect(isWorkspaceRoute("/tasks", "/")).toBe(false);
    expect(workspaceRouteLabel("/tasks/TASK-001")).toBe("Tasks");
    expect(workspaceRouteLabel("/specs/SPEC-001")).toBe("Specs");
    expect(workspaceRouteLabel("/timeline")).toBe("Timeline");
    expect(workspaceRouteLabel("/")).toBe("Overview");
  });
});
