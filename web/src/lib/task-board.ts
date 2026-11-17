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

/** Presentation grouping happens after the shared service has sorted and paged. */
export function groupTaskPage(tasks: DashboardTaskCard[]): DashboardKanbanColumn[] {
  const columns: DashboardKanbanColumn[] = [
    {id:"blocked",title:"Blocked",tasks:[]},{id:"todo",title:"Todo",tasks:[]},
    {id:"in_progress",title:"In progress",tasks:[]},{id:"review",title:"Review",tasks:[]},
    {id:"done",title:"Done / Cancelled",tasks:[]},
  ];
  const byId=new Map(columns.map(column=>[column.id,column]));
  for(const task of tasks)byId.get(task.effectiveStatus==='cancelled'?'done':task.effectiveStatus)?.tasks.push(task);
  return columns;
}
