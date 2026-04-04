import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { AgentsConfig } from "../domain.ts";
import { readProjectConfig } from "../repository.ts";

export interface AgentsBudgetRule {
  target: number;
  hardCap: number;
}

export interface AgentsFileReport {
  absolutePath: string;
  relativePath: string;
  folder: string;
  estimatedTokens: number;
  rule: AgentsBudgetRule;
  ok: boolean;
}

export interface AgentsChainReport {
  relativePath: string;
  chainFolders: string[];
  estimatedTokens: number;
  target: number;
  hardCap: number;
  ok: boolean;
}

export interface AgentsHealthReport {
  config: {
    contextWindowTokens: number;
    rootTarget: number;
    rootHardCap: number;
    chainTarget: number;
    chainHardCap: number;
  };
  files: AgentsFileReport[];
  chains: AgentsChainReport[];
  failures: string[];
  summary: {
    fileCount: number;
    failureCount: number;
    maxFileTokens: number;
    maxChainTokens: number;
    ok: boolean;
  };
}

const EXCLUDED_DIRS = new Set([".git", "node_modules", "dist", "coverage"]);
const RULES: Record<string, { targetMultiplier: number; hardCapMultiplier: number }> = {
  ".": { targetMultiplier: 1, hardCapMultiplier: 1 },
  ".specpm": { targetMultiplier: 1 / 3, hardCapMultiplier: 1 / 3 },
  "docs": { targetMultiplier: 1 / 3, hardCapMultiplier: 5 / 12 },
  "docs/spm": { targetMultiplier: 14 / 45, hardCapMultiplier: 3 / 8 },
  "docs/spm/specs": { targetMultiplier: 11 / 45, hardCapMultiplier: 3 / 8 },
  "docs/spm/tasks": { targetMultiplier: 11 / 45, hardCapMultiplier: 3 / 8 },
  "docs/spm/skills": { targetMultiplier: 11 / 45, hardCapMultiplier: 3 / 8 },
  "scripts": { targetMultiplier: 11 / 45, hardCapMultiplier: 7 / 24 },
  "skills": { targetMultiplier: 1 / 3, hardCapMultiplier: 5 / 12 },
  "src": { targetMultiplier: 7 / 18, hardCapMultiplier: 1 / 2 },
  "src/backends": { targetMultiplier: 4 / 15, hardCapMultiplier: 3 / 8 },
  "src/commands": { targetMultiplier: 11 / 45, hardCapMultiplier: 3 / 8 },
  "src/services": { targetMultiplier: 11 / 45, hardCapMultiplier: 3 / 8 },
  "tests": { targetMultiplier: 1 / 5, hardCapMultiplier: 7 / 24 },
};

export function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

function scaleBudget(value: number, multiplier: number): number {
  return Math.max(1, Math.round(value * multiplier));
}

function rootBudgetsFromConfig(config: AgentsConfig): {
  rootTarget: number;
  rootHardCap: number;
  chainTarget: number;
  chainHardCap: number;
} {
  const rootTarget = Math.round(config.contextWindowTokens * config.rootTargetRatio);
  const rootHardCap = Math.min(
    Math.round(config.contextWindowTokens * config.rootHardCapRatio),
    config.absoluteRootHardCap,
  );
  const chainTarget = Math.round(config.contextWindowTokens * config.chainTargetRatio);
  const chainHardCap = Math.min(
    Math.round(config.contextWindowTokens * config.chainHardCapRatio),
    config.absoluteChainHardCap,
  );

  return {
    rootTarget,
    rootHardCap,
    chainTarget,
    chainHardCap,
  };
}

export function agentsRuleForFolder(folder: string, config: AgentsConfig): AgentsBudgetRule {
  const normalized = folder === "" ? "." : folder;
  const candidates = Object.keys(RULES).filter((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
  const match = candidates.sort((left, right) => right.length - left.length)[0] ?? ".";
  const multipliers = RULES[match]!;
  const rootBudgets = rootBudgetsFromConfig(config);

  return {
    target: scaleBudget(rootBudgets.rootTarget, multipliers.targetMultiplier),
    hardCap: scaleBudget(rootBudgets.rootHardCap, multipliers.hardCapMultiplier),
  };
}

export async function findAgentsFiles(rootDir: string, currentDir = rootDir): Promise<string[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }

      results.push(...(await findAgentsFiles(rootDir, join(currentDir, entry.name))));
      continue;
    }

    if (entry.isFile() && entry.name === "AGENTS.md") {
      results.push(join(currentDir, entry.name));
    }
  }

  return results.sort();
}

export async function buildAgentsHealthReport(rootDir: string): Promise<AgentsHealthReport> {
  const config = await readProjectConfig(rootDir);
  const budgetConfig = rootBudgetsFromConfig(config.agents);
  const files = await findAgentsFiles(rootDir);
  const tokenByFolder = new Map<string, number>();
  const fileReports: AgentsFileReport[] = [];
  const failures: string[] = [];

  for (const file of files) {
    const relFile = relative(rootDir, file);
    const folder = dirname(relFile) === "." ? "." : dirname(relFile);
    const content = await readFile(file, "utf8");
    const estimatedTokens = estimateTokens(content);
    const rule = agentsRuleForFolder(folder, config.agents);
    const ok = estimatedTokens <= rule.hardCap;

    tokenByFolder.set(folder, estimatedTokens);
    fileReports.push({
      absolutePath: file,
      relativePath: relFile,
      folder,
      estimatedTokens,
      rule,
      ok,
    });

    if (!ok) {
      failures.push(`${relFile} exceeds hard cap (${estimatedTokens} > ${rule.hardCap})`);
    }
  }

  const chainReports: AgentsChainReport[] = fileReports.map((file) => {
    const segments = file.folder === "." ? [] : file.folder.split("/");
    const chainFolders = ["."];

    for (let index = 0; index < segments.length; index += 1) {
      chainFolders.push(segments.slice(0, index + 1).join("/"));
    }

    const estimatedTokens = chainFolders.reduce((sum, entry) => sum + (tokenByFolder.get(entry) ?? 0), 0);
    const ok = estimatedTokens <= budgetConfig.chainHardCap;

    if (!ok) {
      failures.push(`${file.relativePath} chain exceeds hard cap (${estimatedTokens} > ${budgetConfig.chainHardCap})`);
    }

    return {
      relativePath: file.relativePath,
      chainFolders,
      estimatedTokens,
      target: budgetConfig.chainTarget,
      hardCap: budgetConfig.chainHardCap,
      ok,
    };
  });

  return {
    config: {
      contextWindowTokens: config.agents.contextWindowTokens,
      rootTarget: budgetConfig.rootTarget,
      rootHardCap: budgetConfig.rootHardCap,
      chainTarget: budgetConfig.chainTarget,
      chainHardCap: budgetConfig.chainHardCap,
    },
    files: fileReports,
    chains: chainReports,
    failures,
    summary: {
      fileCount: fileReports.length,
      failureCount: failures.length,
      maxFileTokens: fileReports.reduce((max, file) => Math.max(max, file.estimatedTokens), 0),
      maxChainTokens: chainReports.reduce((max, chain) => Math.max(max, chain.estimatedTokens), 0),
      ok: failures.length === 0,
    },
  };
}

export function renderAgentsHealthReport(report: AgentsHealthReport): string {
  if (report.files.length === 0) {
    return "No AGENTS.md files found.";
  }

  const lines: string[] = [
    "AGENTS.md budget report",
    "",
    `Context policy | context_window=${report.config.contextWindowTokens} | root_target<=${report.config.rootTarget} | root_hard_cap<=${report.config.rootHardCap} | chain_target<=${report.config.chainTarget} | chain_hard_cap<=${report.config.chainHardCap}`,
    "",
  ];

  for (const file of report.files) {
    lines.push(
      `${file.ok ? "OK" : "FAIL"} ${file.relativePath} | est_tokens=${file.estimatedTokens} | target<=${file.rule.target} | hard_cap<=${file.rule.hardCap}`,
    );
  }

  lines.push("", "Chain report", "");

  for (const chain of report.chains) {
    lines.push(
      `${chain.ok ? "OK" : "FAIL"} ${chain.relativePath} | active_chain_tokens=${chain.estimatedTokens} | target<=${chain.target} | hard_cap<=${chain.hardCap}`,
    );
  }

  if (report.failures.length > 0) {
    lines.push("", "Failures:");
    for (const failure of report.failures) {
      lines.push(`- ${failure}`);
    }
  }

  return lines.join("\n");
}
