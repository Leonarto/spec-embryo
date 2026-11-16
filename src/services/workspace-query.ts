import { SPEC_STATUSES, TASK_STATUSES, type SpecStatus, type TaskStatus } from "../domain.ts";

export const WORKSPACE_PAGE_SIZES = [50, 100, 200] as const;
export type WorkspaceScope = "unarchived" | "all" | "archived";
export type WorkspaceWindow = "7d" | "30d" | "90d";
export type WorkspaceRoute = "overview" | "tasks" | "specs" | "timeline";
export type SortDirection = "asc" | "desc";
export const TASK_SORT_KEYS = ["id", "title", "status", "priority", "spec", "blocked", "dependencies", "downstream", "updatedAt", "createdAt", "completedAt", "cancelledAt"] as const;
export const SPEC_SORT_KEYS = ["id", "title", "status", "progress", "tasks", "blocked", "review", "owner", "updatedAt"] as const;
export type TaskSortKey = typeof TASK_SORT_KEYS[number];
export type SpecSortKey = typeof SPEC_SORT_KEYS[number];
export interface WorkspaceSort<Key extends string = string> { key: Key; direction: SortDirection }
interface WorkspaceQueryBase<Key extends string> {
  q: string;
  specIds: string[];
  sort: WorkspaceSort<Key>[];
  page: number;
  pageSize: typeof WORKSPACE_PAGE_SIZES[number];
  window?: WorkspaceWindow;
}
export interface WorkspaceTaskQuery extends WorkspaceQueryBase<TaskSortKey> {
  kind: "task";
  statuses: TaskStatus[];
  priorities: number[];
  scope: WorkspaceScope;
}
export interface WorkspaceSpecQuery extends WorkspaceQueryBase<SpecSortKey> {
  kind: "spec";
  statuses: SpecStatus[];
  taskScope: WorkspaceScope;
  legacyArchive: boolean;
}
export type WorkspaceListQuery = WorkspaceTaskQuery | WorkspaceSpecQuery;
export interface WorkspaceTimelineQuery {
  specIds: string[];
  window?: WorkspaceWindow;
  scope: WorkspaceScope;
  mode: "active" | "all";
  selectedTaskId?: string;
  legacyArchive: boolean;
}
export interface WorkspaceOptionsQuery { q: string; page: number; pageSize: number; selectedIds: string[] }
export interface WorkspaceViewQuery {
  route: WorkspaceRoute;
  view?: "table" | "board";
  list?: WorkspaceListQuery;
  timeline?: WorkspaceTimelineQuery;
  options: WorkspaceOptionsQuery;
  inspect?: { kind: "task" | "spec"; id: string };
  section?: string;
  simple: boolean;
  requestKey: string;
}

const scopes: readonly WorkspaceScope[] = ["unarchived", "all", "archived"];
const windows: readonly WorkspaceWindow[] = ["7d", "30d", "90d"];
const entityIdPattern = /^(?:TASK|SPEC)-[A-Za-z0-9][A-Za-z0-9_-]*$/;
export function isWorkspaceEntityId(value: string, kind?: "task" | "spec"): boolean {
  return value.length <= 128 && entityIdPattern.test(value) && (!kind || value.startsWith(kind === "task" ? "TASK-" : "SPEC-"));
}
export function normalizeWorkspaceSearch(value: string): string { return value.normalize("NFKC").toLowerCase(); }
function text(value: string | null): string { return (value ?? "").trim().replace(/\s+/g, " ").slice(0, 500); }
function values(params: URLSearchParams, name: string): string[] { return [...new Set(params.getAll(name).flatMap(v => v.split(",")).map(v => v.trim()).filter(Boolean))]; }
function positiveInteger(value: string | null, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}
function specIds(params: URLSearchParams, known?: ReadonlySet<string>): string[] {
  return values(params, "spec").filter(id => isWorkspaceEntityId(id, "spec") && (!known || known.has(id))).sort();
}
function scope(value: string | null, fallback: WorkspaceScope): WorkspaceScope { return scopes.includes(value as WorkspaceScope) ? value as WorkspaceScope : fallback; }
function windowValue(params: URLSearchParams): WorkspaceWindow | undefined { const value = params.get("window"); return windows.includes(value as WorkspaceWindow) ? value as WorkspaceWindow : undefined; }
function sorting<Key extends string>(params: URLSearchParams, keys: readonly Key[], fallback: WorkspaceSort<Key>[]): WorkspaceSort<Key>[] {
  const result: WorkspaceSort<Key>[] = [];
  for (const input of values(params, "sort")) {
    const [key, direction, extra] = input.split(".");
    if (extra || !keys.includes(key as Key) || (direction !== "asc" && direction !== "desc") || result.some(s => s.key === key)) continue;
    result.push({ key: key as Key, direction });
    if (result.length === 2) break;
  }
  return result.length ? result : fallback;
}

export function parseWorkspaceListQuery(kind: "task", params: URLSearchParams, knownSpecIds?: ReadonlySet<string>): WorkspaceTaskQuery;
export function parseWorkspaceListQuery(kind: "spec", params: URLSearchParams, knownSpecIds?: ReadonlySet<string>): WorkspaceSpecQuery;
export function parseWorkspaceListQuery(kind: "task" | "spec", params: URLSearchParams, knownSpecIds?: ReadonlySet<string>): WorkspaceListQuery {
  const ids = specIds(params, knownSpecIds);
  const window = windowValue(params);
  const requestedSize = positiveInteger(params.get("pageSize"), 100);
  const common = { q: text(params.get("q")), specIds: ids, page: positiveInteger(params.get("page"), 1), pageSize: (WORKSPACE_PAGE_SIZES.includes(requestedSize as 100) ? requestedSize : 100) as 50 | 100 | 200, ...(window ? { window } : {}) };
  if (kind === "task") return {
    ...common, kind,
    statuses: TASK_STATUSES.filter(status => values(params, "status").includes(status)),
    priorities: [...new Set(values(params, "priority").map(Number).filter(Number.isFinite))].sort((a,b) => a-b),
    scope: scope(params.get("scope"), "unarchived"),
    sort: sorting(params, TASK_SORT_KEYS, [{ key: "priority", direction: "asc" }]),
  };
  return {
    ...common, kind,
    statuses: SPEC_STATUSES.filter(status => [...values(params, "status"), ...values(params, "spec_status")].includes(status)),
    taskScope: scope(params.get("taskScope"), "all"),
    legacyArchive: !params.has("taskScope") && (ids.length > 0 || Boolean(window)),
    sort: sorting(params, SPEC_SORT_KEYS, [{ key: "status", direction: "asc" }]),
  };
}

export function serializeWorkspaceListQuery(query: WorkspaceListQuery, preserveLegacy = false): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  for (const id of query.specIds) params.append("spec", id);
  for (const status of query.statuses) params.append("status", status);
  for (const sort of query.sort) params.append("sort", `${sort.key}.${sort.direction}`);
  params.set("page", String(query.page)); params.set("pageSize", String(query.pageSize));
  if (query.window) params.set("window", query.window);
  if (query.kind === "task") {
    params.set("scope", query.scope);
    for (const priority of query.priorities) params.append("priority", String(priority));
  } else if (!preserveLegacy || !query.legacyArchive) params.set("taskScope", query.taskScope);
  return params;
}

export function parseWorkspaceTimelineQuery(params: URLSearchParams, knownSpecIds?: ReadonlySet<string>): WorkspaceTimelineQuery {
  const ids = specIds(params, knownSpecIds), window = windowValue(params);
  const legacyArchive = !params.has("scope") && (ids.length > 0 || Boolean(window));
  const selected = params.get("selected_task")?.trim();
  return { specIds: ids, ...(window ? { window } : {}), scope: scope(params.get("scope"), legacyArchive ? "all" : "unarchived"), mode: params.get("timeline_mode") === "all" ? "all" : "active", ...(selected && isWorkspaceEntityId(selected,"task") ? { selectedTaskId: selected } : {}), legacyArchive };
}
export function parseWorkspaceOptionsQuery(params: URLSearchParams, selectedIds: string[] = []): WorkspaceOptionsQuery {
  return { q: text(params.get("option_q")), page: positiveInteger(params.get("option_page"), 1), pageSize: Math.min(100, positiveInteger(params.get("option_pageSize"), 50)), selectedIds: [...new Set(selectedIds)].filter(id=>isWorkspaceEntityId(id,"spec")).sort() };
}

export function normalizeViewQuery(route: WorkspaceRoute, params: URLSearchParams, knownSpecIds?: ReadonlySet<string>): WorkspaceViewQuery {
  const list = route === "tasks" ? parseWorkspaceListQuery("task",params,knownSpecIds) : route === "specs" ? parseWorkspaceListQuery("spec",params,knownSpecIds) : undefined;
  const timeline = route === "timeline" ? parseWorkspaceTimelineQuery(params,knownSpecIds) : undefined;
  const selectedIds = list?.specIds ?? timeline?.specIds ?? [];
  const options = parseWorkspaceOptionsQuery(params,selectedIds);
  const rawInspect = params.get("inspect")?.split(":");
  const inspect = rawInspect?.length === 2 && (rawInspect[0] === "task" || rawInspect[0] === "spec") && isWorkspaceEntityId(rawInspect[1]!,rawInspect[0]) ? { kind: rawInspect[0], id: rawInspect[1]! } as {kind:"task"|"spec";id:string} : undefined;
  const allowedSections = inspect?.kind === "spec" ? ["overview","relations","document","questions","decisions"] : ["overview","relations","document"];
  const section = inspect && allowedSections.includes(params.get("section") ?? "") ? params.get("section")! : undefined;
  const simple = params.get("simple") === "1";
  const view: WorkspaceViewQuery["view"] = route === "tasks" ? (simple || params.get("view") !== "board" ? "table" : "board") : undefined;
  const value = { route, ...(view ? {view} : {}), ...(list ? {list} : {}), ...(timeline ? {timeline} : {}), options, ...(inspect ? {inspect} : {}), ...(section ? {section} : {}), simple };
  return { ...value, requestKey: JSON.stringify(value) };
}

/** Canonical URL allowlist. New user interactions write explicit archive scope. */
export function serializeViewQuery(view: WorkspaceViewQuery, preserveLegacy = false): URLSearchParams {
  const params = view.list ? serializeWorkspaceListQuery(view.list,preserveLegacy) : new URLSearchParams();
  if(view.route==="tasks")params.set("view",view.simple?"table":view.view??"table");
  if(view.timeline) {
    for(const id of view.timeline.specIds)params.append("spec",id);
    if(view.timeline.window)params.set("window",view.timeline.window);
    if(!preserveLegacy||!view.timeline.legacyArchive)params.set("scope",view.timeline.scope);
    params.set("timeline_mode",view.timeline.mode);
    if(view.timeline.selectedTaskId)params.set("selected_task",view.timeline.selectedTaskId);
  }
  if(view.inspect){params.set("inspect",`${view.inspect.kind}:${view.inspect.id}`);if(view.section)params.set("section",view.section);}
  if(view.simple)params.set("simple","1");
  if(view.options.q)params.set("option_q",view.options.q);
  if(view.options.page>1)params.set("option_page",String(view.options.page));
  if(view.options.pageSize!==50)params.set("option_pageSize",String(view.options.pageSize));
  return params;
}

/** Route transitions retain only compatible spec filters, never another view's paging/trace. */
export function transitionViewQuery(route: WorkspaceRoute, current: URLSearchParams): URLSearchParams {
  const compatible = new URLSearchParams();
  if(route!=="overview")for(const id of values(current,"spec"))compatible.append("spec",id);
  return serializeViewQuery(normalizeViewQuery(route,compatible));
}

/** Inspector-only changes preserve list/trace intention and filter drafts. */
export function workspaceListURL(value:string|URL):string {
  const url=new URL(value);url.searchParams.delete('inspect');url.searchParams.delete('section');for(const name of [...url.searchParams.keys()])if(name.startsWith('rel.'))url.searchParams.delete(name);return url.href;
}

/** Request identity follows URL intention, never a snapshot's available IDs/page count. */
export function workspaceRequestKey(route: WorkspaceRoute, params: URLSearchParams): string {
  const intent=normalizeViewQuery(route,params);
  delete intent.inspect;delete intent.section;
  if(intent.list?.kind==="task"&&intent.view==="board")intent.list.scope="unarchived";
  return normalizeViewQuery(route,serializeViewQuery(intent,true)).requestKey;
}
