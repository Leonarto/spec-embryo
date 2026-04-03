import type { DashboardKanbanColumn, DashboardTaskCard } from "../../../src/services/dashboard.ts";

export function matchesSelectedSpecs(task: DashboardTaskCard, selectedSpecIds: string[]): boolean {
  if (selectedSpecIds.length === 0) {
    return true;
  }

  return task.specIds.some((specId) => selectedSpecIds.includes(specId));
}

export function filterKanbanBySpecs(columns: DashboardKanbanColumn[], selectedSpecIds: string[]): DashboardKanbanColumn[] {
  return columns.map((column) => ({
    ...column,
    tasks: column.tasks.filter((task) => matchesSelectedSpecs(task, selectedSpecIds)),
  }));
}

export function countKanbanTasks(columns: DashboardKanbanColumn[]): number {
  return columns.reduce((total, column) => total + column.tasks.length, 0);
}
