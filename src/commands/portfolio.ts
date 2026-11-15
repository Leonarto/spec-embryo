import type { ParsedArgs } from "../cli.ts";
import { flagValue } from "../cli.ts";
import {
  buildPortfolioStatus,
  linkPortfolioProject,
  registerPortfolioProject,
  searchPortfolio,
  type PortfolioProjectStatus,
} from "../services/portfolio.ts";

function parseCommaList(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function registryFile(parsed: ParsedArgs): string | undefined {
  return flagValue(parsed, "registry");
}

function renderProject(project: PortfolioProjectStatus): string {
  const status = project.health === "ok" ? "ok" : `${project.health}: ${project.error ?? "unknown issue"}`;
  const lines = [
    `${project.id} [${status}] ${project.name}`,
    `  path: ${project.path}`,
    `  focus: ${project.focus ?? "unavailable"}`,
    `  active: specs ${project.activeSpecIds.join(", ") || "none"} | tasks ${project.activeTaskIds.join(", ") || "none"}`,
    `  review: ${project.reviewTaskIds.join(", ") || "none"} | blocked: ${project.blockedTaskIds.join(", ") || "none"} | ready: ${project.readyTaskIds.join(", ") || "none"}`,
  ];

  if (project.dependsOn.length > 0 || project.relatedProjects.length > 0 || project.milestones.length > 0) {
    lines.push(
      `  links: depends_on ${project.dependsOn.join(", ") || "none"} | related ${project.relatedProjects.join(", ") || "none"} | milestones ${project.milestones.join(", ") || "none"}`,
    );
  }

  return lines.join("\n");
}

export async function runPortfolioCommand(rootDir: string, parsed: ParsedArgs): Promise<string> {
  const subcommand = parsed.subcommand ?? "status";

  if (subcommand === "register") {
    const projectPath = parsed.positionals[2] ?? rootDir;
    const result = await registerPortfolioProject(projectPath, {
      registryFile: registryFile(parsed),
      id: flagValue(parsed, "id"),
      name: flagValue(parsed, "name"),
      tags: parseCommaList(flagValue(parsed, "tags")),
    });

    if (parsed.flags.has("json")) {
      return JSON.stringify(result, null, 2);
    }

    return `${result.created ? "Registered" : "Updated"} ${result.project.id} in ${result.registryFile}`;
  }

  if (subcommand === "link") {
    const projectId = parsed.positionals[2];
    if (!projectId) {
      throw new Error("`portfolio link` requires <PROJECT-ID>.");
    }

    const result = await linkPortfolioProject(projectId, {
      registryFile: registryFile(parsed),
      dependsOn: parseCommaList(flagValue(parsed, "depends-on")),
      relatedProjects: parseCommaList(flagValue(parsed, "related")),
      milestones: parseCommaList(flagValue(parsed, "milestones")),
    });

    if (parsed.flags.has("json")) {
      return JSON.stringify(result, null, 2);
    }

    return `Updated links for ${result.project.id} in ${result.registryFile}`;
  }

  if (subcommand === "search") {
    const query = flagValue(parsed, "text") ?? parsed.positionals[2];
    if (!query) {
      throw new Error("`portfolio search` requires <text> or --text.");
    }

    const result = await searchPortfolio(query, registryFile(parsed));
    if (parsed.flags.has("json")) {
      return JSON.stringify(result, null, 2);
    }

    if (result.results.length === 0) {
      return "No portfolio projects matched.";
    }

    return result.results.map((project) => `${renderProject(project)}\n  match: ${project.reasons.join(", ")}`).join("\n\n");
  }

  if (subcommand !== "list" && subcommand !== "status") {
    throw new Error("Supported portfolio commands are `portfolio register`, `portfolio list`, `portfolio status`, `portfolio search`, and `portfolio link`.");
  }

  const bundle = await buildPortfolioStatus(registryFile(parsed));
  if (parsed.flags.has("json")) {
    return JSON.stringify(bundle, null, 2);
  }

  if (bundle.projects.length === 0) {
    return `No portfolio projects registered in ${bundle.registryFile}.`;
  }

  const lines = [`Portfolio registry: ${bundle.registryFile}`, "", ...bundle.projects.map(renderProject)];
  if (bundle.relationshipIssues.length > 0) {
    lines.push("", "Relationship issues:", ...bundle.relationshipIssues.map((issue) => `- ${issue.message}`));
  }

  return lines.join("\n");
}
