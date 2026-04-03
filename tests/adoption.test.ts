import { describe, expect, test } from "bun:test";
import { buildAdoptionGuidance } from "../src/services/adoption.ts";
import type { AdoptionInspection } from "../src/services/layout.ts";
import type { DoctorFinding } from "../src/services/doctor.ts";

function createInspection(overrides: Partial<AdoptionInspection>): AdoptionInspection {
  return {
    state: "fresh",
    layoutChoice: {
      memoryDir: "docs/spm",
      source: "default",
      candidates: [],
      requiresChoice: false,
    },
    hasConfig: false,
    hasHiddenSpecpmDir: false,
    managedHomes: [],
    findings: [],
    ...overrides,
  };
}

describe("adoption guidance", () => {
  test("recommends import flow for legacy docs repos", () => {
    const guidance = buildAdoptionGuidance({
      adoption: createInspection({
        state: "legacy-docs",
        layoutChoice: {
          memoryDir: "docs/spm",
          source: "adopted",
          adoptedHome: "docs",
          candidates: [{ relativePath: "docs", reason: "docs" }],
          requiresChoice: false,
        },
        findings: ["Detected documentation/spec surfaces: `docs` (docs)."],
      }),
      memoryDir: "docs/spm",
      created: ["docs/spm/current.md"],
    });

    expect(guidance.overview).toContain("importable");
    expect(guidance.recommendedCommands.some((item) => item.command.includes("spec import-prompt --source docs"))).toBe(true);
    expect(guidance.remainingWork.some((item) => item.includes("Legacy docs"))).toBe(true);
  });

  test("includes doctor-driven cleanup guidance for partially adopted repos", () => {
    const doctorFindings: DoctorFinding[] = [
      {
        severity: "warning",
        code: "missing-current-state",
        message: "A partially adopted repo is missing its current state file.",
      },
    ];

    const guidance = buildAdoptionGuidance({
      adoption: createInspection({
        state: "partially-adopted",
        findings: ["This repo already shows partial Spec Embryo signals."],
      }),
      memoryDir: "docs/spm",
      doctorFindings,
    });

    expect(guidance.recommendedCommands.some((item) => item.command === "spm doctor --json")).toBe(true);
    expect(guidance.remainingWork.some((item) => item.includes("still needs migration or cleanup"))).toBe(true);
    expect(guidance.remainingWork.some((item) => item.includes("Doctor reported 1 issue"))).toBe(true);
  });
});
