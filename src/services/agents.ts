import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

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
const CHAIN_TARGET = 1800;
const CHAIN_HARD_CAP = 2200;

const RULES: Record<string, AgentsBudgetRule> = {
  ".": { target: 900, hardCap: 1200 },
  ".specpm": { target: 300, hardCap: 400 },
  "docs": { target: 300, hardCap: 500 },
  "docs/spm": { target: 280, hardCap: 450 },
  "docs/spm/specs": { target: 220, hardCap: 450 },
  "docs/spm/tasks": { target: 220, hardCap: 450 },
  "docs/spm/skills": { target: 220, hardCap: 450 },
  "scripts": { target: 220, hardCap: 350 },
  "skills": { target: 300, hardCap: 500 },
  "src": { target: 350, hardCap: 600 },
  "src/backends": { target: 240, hardCap: 450 },
  "src/commands": { target: 220, hardCap: 450 },
  "src/services": { target: 220, hardCap: 450 },
  "tests": { target: 180, hardCap: 350 },
};

export function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

export function agentsRuleForFolder(folder: string): AgentsBudgetRule {
  const normalized = folder === "" ? "." : folder;
  const candidates = Object.keys(RULES).filter((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
  const match = candidates.sort((left, right) => right.length - left.length)[0] ?? ".";
  return RULES[match]!;
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
  const files = await findAgentsFiles(rootDir);
  const tokenByFolder = new Map<string, number>();
  const fileReports: AgentsFileReport[] = [];
  const failures: string[] = [];

  for (const file of files) {
    const relFile = relative(rootDir, file);
    const folder = dirname(relFile) === "." ? "." : dirname(relFile);
    const content = await readFile(file, "utf8");
    const estimatedTokens = estimateTokens(content);
    const rule = agentsRuleForFolder(folder);
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
    const ok = estimatedTokens <= CHAIN_HARD_CAP;

    if (!ok) {
      failures.push(`${file.relativePath} chain exceeds hard cap (${estimatedTokens} > ${CHAIN_HARD_CAP})`);
    }

    return {
      relativePath: file.relativePath,
      chainFolders,
      estimatedTokens,
      target: CHAIN_TARGET,
      hardCap: CHAIN_HARD_CAP,
      ok,
    };
  });

  return {
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

  const lines: string[] = ["AGENTS.md budget report", ""];

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
