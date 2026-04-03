import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { buildManagedPaths } from "./layout.ts";

const SUPPORTED_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".rst", ".yaml", ".yml", ".toml", ".json"]);

export interface SpecImportSourceFile {
  absolutePath: string;
  relativePath: string;
  extension: string;
  chars: number;
  headings: string[];
  excerpt: string;
}

export interface SpecImportBundle {
  sourceRoot: string;
  fileCount: number;
  files: SpecImportSourceFile[];
  userInstructions?: string;
  targetStructure: {
    specsDir: string;
    tasksDir: string;
    specFrontmatterFields: string[];
    taskFrontmatterFields: string[];
  };
  migrationRules: string[];
  recommendedPrompt: string;
  expectedOutputFormat: {
    requiredFiles: string[];
    migrationChecklist: string[];
    outputSections: string[];
  };
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, Math.max(0, limit - 14))}\n...[truncated]`;
}

function extractHeadings(content: string): string[] {
  return normalizeWhitespace(content)
    .split("\n")
    .filter((line) => /^#{1,6}\s+/.test(line))
    .slice(0, 12)
    .map((line) => line.replace(/^#{1,6}\s+/, "").trim())
    .filter(Boolean);
}

async function walkSupportedFiles(rootDir: string, currentDir = rootDir): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }

    const fullPath = join(currentDir, entry.name);

    if (entry.isDirectory()) {
      results.push(...(await walkSupportedFiles(rootDir, fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name !== "AGENTS.md" && SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }

  return results.sort();
}

export async function buildSpecImportBundle(
  rootDir: string,
  sourceDir: string,
  options?: {
    instructions?: string;
    maxCharsPerFile?: number;
    targetMemoryDir?: string;
  },
): Promise<SpecImportBundle> {
  const maxCharsPerFile = options?.maxCharsPerFile ?? 1800;
  const managed = buildManagedPaths(options?.targetMemoryDir ?? "docs/spm");
  const absoluteSourceDir = sourceDir.startsWith("/") ? sourceDir : join(rootDir, sourceDir);
  const files = await walkSupportedFiles(absoluteSourceDir);

  const fileEntries = await Promise.all(
    files.map(async (filePath) => {
      const content = await readFile(filePath, "utf8");
      return {
        absolutePath: filePath,
        relativePath: relative(rootDir, filePath),
        extension: extname(filePath).toLowerCase(),
        chars: content.length,
        headings: extractHeadings(content),
        excerpt: truncate(normalizeWhitespace(content), maxCharsPerFile),
      };
    }),
  );

  const sourceSummary = fileEntries
    .slice(0, 10)
    .map((file) => `- ${file.relativePath} (${file.chars} chars${file.headings.length > 0 ? `; headings: ${file.headings.join(" | ")}` : ""})`)
    .join("\n");

  const instructionSuffix = options?.instructions?.trim()
    ? `\nAdditional migration instructions from the user:\n${options.instructions.trim()}`
    : "";

  return {
    sourceRoot: absoluteSourceDir,
    fileCount: fileEntries.length,
    files: fileEntries,
    userInstructions: options?.instructions?.trim() || undefined,
    targetStructure: {
      specsDir: `${managed.specsDir}/`,
      tasksDir: `${managed.tasksDir}/`,
      specFrontmatterFields: ["doc_kind", "id", "title", "status", "summary", "task_ids", "tags", "owner", "updated_at"],
      taskFrontmatterFields: ["doc_kind", "id", "title", "status", "summary", "spec_ids", "depends_on", "blocked_by", "priority", "owner_role", "tags", "updated_at"],
    },
    migrationRules: [
      "Create Markdown files with TOML frontmatter so Spec Embryo can parse them deterministically.",
      "Use `doc_kind = \"spec\"` for specs and `doc_kind = \"task\"` for tasks.",
      "Keep facts faithful to the source docs. Do not invent requirements, dependencies, or statuses unless the user explicitly asked for interpretation.",
      "When dependencies are unclear, prefer leaving `depends_on = []` and note ambiguity in the body instead of guessing.",
      "Prefer one coherent spec per product slice and create linked tasks for executable work.",
      "Preserve important goals, constraints, decisions, and non-goals in Markdown body sections.",
      "Use stable IDs like `SPEC-001` and `TASK-001`.",
      `If the source folder mixes strategy and execution notes, separate them into \`${managed.specsDir}/\` and \`${managed.tasksDir}/\` rather than flattening everything into one file.`,
    ],
    recommendedPrompt: [
      "You are migrating an existing project spec/docs folder into Spec Embryo's deterministic format.",
      "Use the scanned source file inventory and excerpts as the source of truth.",
      `Produce repo-native Markdown files under \`${managed.specsDir}/\` and \`${managed.tasksDir}/\` using TOML frontmatter.`,
      "The result must be deterministic-friendly: explicit IDs, linked tasks, and no missing required frontmatter fields.",
      "Do not invent facts. When something is ambiguous, preserve the ambiguity in the Markdown body or add a concise note instead of fabricating structure.",
      "Prefer stable spec intent in spec files and actionable execution slices in task files.",
      "",
      "Source inventory:",
      sourceSummary || "- No supported files found.",
      instructionSuffix,
    ]
      .filter(Boolean)
      .join("\n"),
    expectedOutputFormat: {
      requiredFiles: [`${managed.specsDir}/*.md`, `${managed.tasksDir}/*.md`],
      migrationChecklist: [
        "Every generated spec file has the required TOML frontmatter fields.",
        "Every generated task file links back to one or more spec IDs.",
        "No task dependency is invented unless explicit in the source.",
        "Body sections preserve meaningful goals, scope, decisions, and notes from the source docs.",
      ],
      outputSections: ["migration-summary", "files-created-or-updated", "ambiguities", "follow-up-gaps"],
    },
  };
}

export function renderSpecImportBundle(bundle: SpecImportBundle): string {
  const lines: string[] = [];

  lines.push("Spec import prompt bundle");
  lines.push("");
  lines.push(`Source root: ${bundle.sourceRoot}`);
  lines.push(`Supported files scanned: ${bundle.fileCount}`);
  lines.push(`Target specs dir: ${bundle.targetStructure.specsDir}`);
  lines.push(`Target tasks dir: ${bundle.targetStructure.tasksDir}`);
  lines.push("");
  lines.push("Target spec frontmatter fields:");
  lines.push(`- ${bundle.targetStructure.specFrontmatterFields.join(", ")}`);
  lines.push("Target task frontmatter fields:");
  lines.push(`- ${bundle.targetStructure.taskFrontmatterFields.join(", ")}`);
  lines.push("");
  lines.push("Migration rules:");
  for (const rule of bundle.migrationRules) {
    lines.push(`- ${rule}`);
  }
  lines.push("");
  lines.push("Scanned source files:");
  if (bundle.files.length === 0) {
    lines.push("- none");
  } else {
    for (const file of bundle.files) {
      const headingText = file.headings.length > 0 ? ` | headings: ${file.headings.join(" | ")}` : "";
      lines.push(`- ${file.relativePath} (${file.chars} chars${headingText})`);
    }
  }
  lines.push("");
  lines.push("Recommended prompt:");
  lines.push(bundle.recommendedPrompt);
  lines.push("");
  lines.push("Expected output format:");
  lines.push(`- required files: ${bundle.expectedOutputFormat.requiredFiles.join(", ")}`);
  lines.push(`- output sections: ${bundle.expectedOutputFormat.outputSections.join(", ")}`);

  if (bundle.userInstructions) {
    lines.push("");
    lines.push(`User instructions: ${bundle.userInstructions}`);
  }

  lines.push("");
  lines.push("File excerpts:");
  for (const file of bundle.files) {
    lines.push("");
    lines.push(`## ${file.relativePath}`);
    lines.push(file.excerpt || "[empty file]");
  }

  return lines.join("\n");
}
