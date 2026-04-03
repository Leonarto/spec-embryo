import { join } from "node:path";
import type { ProjectConfig } from "./domain.ts";

export interface ProjectPaths {
  rootDir: string;
  specpmDir: string;
  configFile: string;
  tempDir: string;
  memoryDir: string;
  stateFile: string;
  handoffsDir: string;
  specsDir: string;
  tasksDir: string;
  skillsDir: string;
  templatesDir: string;
}

export function resolveProjectPaths(rootDir: string, config?: ProjectConfig): ProjectPaths {
  return {
    rootDir,
    specpmDir: join(rootDir, ".specpm"),
    configFile: join(rootDir, ".specpm", "config.toml"),
    tempDir: join(rootDir, ".specpm", "tmp"),
    memoryDir: config ? join(rootDir, config.memoryDir) : join(rootDir, "docs", "spm"),
    stateFile: config ? join(rootDir, config.stateFile) : join(rootDir, "docs", "spm", "current.md"),
    handoffsDir: config ? join(rootDir, config.handoffsDir) : join(rootDir, "docs", "spm", "handoffs"),
    specsDir: config ? join(rootDir, config.specsDir) : join(rootDir, "docs", "spm", "specs"),
    tasksDir: config ? join(rootDir, config.tasksDir) : join(rootDir, "docs", "spm", "tasks"),
    skillsDir: config ? join(rootDir, config.skillsDir) : join(rootDir, "docs", "spm", "skills"),
    templatesDir: join(rootDir, ".specpm", "templates"),
  };
}
