import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import type { SpecDocument, TaskDocument } from "../domain.ts";
import { createSpec, createTask } from "../repository.ts";

const SUPPORTED_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);

export interface LegacyImportFilePlan {
  relativePath: string;
  title: string;
  summary: string;
  taskTitles: string[];
  skippedReason?: string;
}

export interface LegacyImportPlan {
  sourceRoot: string;
  apply: boolean;
  files: LegacyImportFilePlan[];
  skipped: LegacyImportFilePlan[];
  created: {
    specs: SpecDocument[];
    tasks: TaskDocument[];
  };
}

function isInsideProject(rootDir: string, filePath: string): boolean {
  const relativePath = relative(rootDir, filePath);
  return relativePath.length === 0 || (!relativePath.startsWith("..") && !relativePath.startsWith("/"));
}

function isSpmOwnedPath(rootDir: string, filePath: string): boolean {
  if (!isInsideProject(rootDir, filePath)) {
    return false;
  }

  const parts = relative(rootDir, filePath).split(/[\\/]+/u);
  return (
    parts[0] === ".specpm" ||
    parts[0] === "spm" ||
    (parts[0] === "docs" && parts[1] === "spm")
  );
}

async function walkFiles(projectRoot: string, rootDir: string, currentDir = rootDir): Promise<string[]> {
  if (isSpmOwnedPath(projectRoot, currentDir)) {
    return [];
  }

  const entries = await readdir(currentDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }

    const fullPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(projectRoot, rootDir, fullPath)));
      continue;
    }

    if (entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function firstHeading(content: string, fallback: string): string {
  const heading = content
    .split("\n")
    .map((line) => line.match(/^#{1,6}\s+(.+)$/)?.[1]?.trim())
    .find((value): value is string => Boolean(value));
  return heading ?? fallback.replace(/\.[^.]+$/u, "").replace(/[-_]+/g, " ");
}

function firstParagraph(content: string): string {
  const paragraph = content
    .split(/\n\s*\n/u)
    .map((block) => block.replace(/^#{1,6}\s+/gm, "").replace(/^[-*]\s+/gm, "").trim())
    .find((block) => block.length > 0);
  return paragraph ? paragraph.slice(0, 220) : "Imported from legacy planning material.";
}

function taskTitles(content: string): string[] {
  const fromCheckboxes = content
    .split("\n")
    .map((line) => line.match(/^\s*[-*]\s+\[[ xX]\]\s+(.+)$/)?.[1]?.trim())
    .filter((value): value is string => Boolean(value));
  const fromTodos = content
    .split("\n")
    .map((line) => line.match(/^\s*(?:TODO|Task):\s+(.+)$/i)?.[1]?.trim())
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set([...fromCheckboxes, ...fromTodos])).slice(0, 12);
}

function fallbackFileTitle(filePath: string): string {
  return filePath.split("/").at(-1) ?? "Legacy planning material";
}

export async function buildLegacyImportPlan(
  rootDir: string,
  sourceDir: string,
  options: { apply?: boolean } = {},
): Promise<LegacyImportPlan> {
  const sourceRoot = sourceDir.startsWith("/") ? sourceDir : join(rootDir, sourceDir);
  const files = await walkFiles(rootDir, sourceRoot);
  const plans: LegacyImportFilePlan[] = [];
  const skipped: LegacyImportFilePlan[] = [];
  const created: LegacyImportPlan["created"] = { specs: [], tasks: [] };

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    const relativePath = relative(rootDir, filePath);
    const title = firstHeading(content, fallbackFileTitle(filePath));
    const summary = firstParagraph(content);
    const tasks = taskTitles(content);
    const plan: LegacyImportFilePlan = {
      relativePath,
      title,
      summary,
      taskTitles: tasks,
    };

    if (content.trim().length === 0) {
      skipped.push({ ...plan, skippedReason: "empty file" });
      continue;
    }

    plans.push(plan);

    if (options.apply) {
      const spec = await createSpec(rootDir, {
        title,
        summary,
        tags: ["legacy-import"],
      });
      created.specs.push(spec);

      for (const taskTitle of tasks.length > 0 ? tasks : [`Review imported material from ${relativePath}`]) {
        created.tasks.push(
          await createTask(rootDir, {
            title: taskTitle,
            summary: `Imported follow-up from ${relativePath}.`,
            specIds: [spec.id],
            priority: 2,
            tags: ["legacy-import"],
          }),
        );
      }
    }
  }

  return {
    sourceRoot,
    apply: options.apply === true,
    files: plans,
    skipped,
    created,
  };
}

export function renderLegacyImportPlan(plan: LegacyImportPlan): string {
  const lines = [
    plan.apply ? "Legacy import applied" : "Legacy import plan",
    "",
    `Source root: ${plan.sourceRoot}`,
    `Files mapped: ${plan.files.length}`,
    `Files skipped: ${plan.skipped.length}`,
  ];

  if (plan.created.specs.length > 0 || plan.created.tasks.length > 0) {
    lines.push("", `Created specs: ${plan.created.specs.map((spec) => spec.id).join(", ") || "none"}`);
    lines.push(`Created tasks: ${plan.created.tasks.map((task) => task.id).join(", ") || "none"}`);
  }

  if (plan.files.length > 0) {
    lines.push("", "Mapped files:");
    for (const file of plan.files) {
      lines.push(`- ${file.relativePath} -> spec "${file.title}" | tasks ${file.taskTitles.length || 1}`);
    }
  }

  if (plan.skipped.length > 0) {
    lines.push("", "Skipped files:");
    for (const file of plan.skipped) {
      lines.push(`- ${file.relativePath}: ${file.skippedReason ?? "unsupported"}`);
    }
  }

  return lines.join("\n");
}
