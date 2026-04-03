#!/usr/bin/env bun

import { cwd, exit } from "node:process";
import { buildAgentsHealthReport, renderAgentsHealthReport } from "../src/services/agents.ts";

async function main(): Promise<void> {
  const rootDir = cwd();
  const report = await buildAgentsHealthReport(rootDir);
  console.log(renderAgentsHealthReport(report));
  if (!report.summary.ok) {
    exit(1);
  }
}

await main();
