import { createHash } from "node:crypto";
import { realpath } from "node:fs/promises";
import type { ProjectContext, SpecDocument, TaskDocument } from "../domain.ts";
import { SPEC_STATUSES, TASK_STATUSES } from "../domain.ts";
import { buildTaskAnalysisIndex, deriveNextActions, deriveStatusSnapshot, type TaskAnalysisIndex } from "../engine.ts";
import { loadProjectContext } from "../repository.ts";
import { buildAgentsHealthReport } from "./agents.ts";
import { buildSpecProgress, buildTimelineProjection, toTaskCard, type DashboardData, type DashboardTaskCard } from "./dashboard.ts";
import { documentSourceHash } from "./document-provenance.ts";
import { normalizeViewQuery, normalizeWorkspaceSearch, workspaceRequestKey, type WorkspaceListQuery, type WorkspaceOptionsQuery, type WorkspaceRoute, type WorkspaceScope, type WorkspaceSort, type WorkspaceSpecQuery, type WorkspaceTaskQuery, type WorkspaceViewQuery, type WorkspaceWindow } from "./workspace-query.ts";

export interface WorkspaceTaskRow extends DashboardTaskCard { updatedAt?: string; createdAt?: string }
export interface WorkspaceSpecRow {
  id: string; title: string; summary: string; status: SpecDocument["status"];
  taskIds: string[]; linkedTaskCount: number; progress: ReturnType<typeof buildSpecProgress>;
  owner?: string; updatedAt?: string; tags: string[];
}
export interface WorkspaceListResult<Row, Query extends WorkspaceListQuery = WorkspaceListQuery> {
  rows: Row[]; totalMatching: number; totalInScope: number; page: number; requestedPage: number; pageSize: number;
  normalizedQuery: Query; revision: string; generatedAt: string;
}
export interface WorkspaceSpecOption { id: string; title?: string; status: SpecDocument["status"]; labelOmitted?: true; reason?: "title-budget" }
export interface WorkspaceOptionsResult {
  options: WorkspaceSpecOption[]; selected: WorkspaceSpecOption[]; totalMatching: number;
  page: number; pageSize: number; q: string; revision: string;
}
export interface WorkspaceShellData { project: DashboardData["project"] & {key:string}; git: DashboardData["git"] }
export interface WorkspaceFilterData {
  selectedSpecIds: string[]; timeWindow?: WorkspaceWindow; hasActiveFilters: boolean;
  includesArchived: boolean; legacyArchive: boolean; scope: WorkspaceScope;
  unavailableSpecIds: string[];
  options: WorkspaceOptionsResult;
}
export interface WorkspaceTasksData { view:"table"|"board"; result: WorkspaceListResult<WorkspaceTaskRow,WorkspaceTaskQuery>; filters: WorkspaceFilterData }
export interface WorkspaceSpecsData { result: WorkspaceListResult<WorkspaceSpecRow,WorkspaceSpecQuery>; filters: WorkspaceFilterData; progressIsSubset: boolean }
export interface WorkspaceTimelineData { timeline: ReturnType<typeof buildTimelineProjection>; filters: WorkspaceFilterData }
export interface WorkspaceOverviewData {
  counts: DashboardData["counts"]; currentState: DashboardData["currentState"]; nextActions: string[];
  agents: DashboardData["agents"]; blockedTasks: Array<{id:string;title:string}>;
  reviewTasks: Array<{id:string;title:string}>; criticalPath: Array<{id:string;title:string}>;
  dependencyIssues: DashboardData["dependencyIssues"]; recentHandoff?: DashboardData["recentHandoff"];
  specs: Array<{id:string;linkedTaskCount:number}>;
}
interface WorkspaceRouteData { overview: WorkspaceOverviewData; tasks: WorkspaceTasksData; specs: WorkspaceSpecsData; timeline: WorkspaceTimelineData }
export type WorkspaceEnvelope<Route extends WorkspaceRoute = WorkspaceRoute> = Route extends WorkspaceRoute ? {
  schemaVersion: 1; route: Route; requestKey: string; revision: string; generatedAt: string;
  shell: WorkspaceShellData; data: WorkspaceRouteData[Route];
} : never;
export interface WorkspaceSource {
  context: ProjectContext; analysis: TaskAnalysisIndex; specById: Map<string,SpecDocument>;
  knownSpecIds: Set<string>; revision: string; now: number;
  taskRows: () => Map<string,WorkspaceTaskRow>;
}
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const compareText = (a: string,b: string) => a<b?-1:a>b?1:0;
const generatedAt = (source: WorkspaceSource) => new Date(source.now).toISOString();

export function createWorkspaceSource(context: ProjectContext, now = Date.now()): WorkspaceSource {
  const analysis = buildTaskAnalysisIndex(context.tasks);
  const documents = [context.currentState,...context.specs,...context.tasks,...context.handoffs,...context.sessionNotes,...context.orgNotes];
  const fingerprints = documents.map(doc => [doc.id,documentSourceHash(doc) ?? digest(JSON.stringify(doc))]).sort((a,b)=>compareText(a[0]!,b[0]!));
  const revision = digest(JSON.stringify({ config:context.config,git:context.git,documents:fingerprints }));
  let rows: Map<string,WorkspaceTaskRow> | undefined;
  return { context, analysis, specById:new Map(context.specs.map(spec=>[spec.id,spec])), knownSpecIds:new Set(context.specs.map(spec=>spec.id)), revision, now,
    taskRows: () => rows ??= new Map([...analysis.byId.values()].map(task=>[task.id,{...toTaskCard(task,analysis.byId,analysis),updatedAt:task.updatedAt,createdAt:task.createdAt}])) };
}
export async function loadWorkspaceSource(rootDir: string, now = Date.now()): Promise<WorkspaceSource> { return createWorkspaceSource(await loadProjectContext(await realpath(rootDir)),now); }
export function buildWorkspaceShell(source: WorkspaceSource): WorkspaceShellData {
  const {context}=source;
  return { project:{name:context.config.projectName,memoryDir:context.config.memoryDir,key:digest(`spm-workspace-v1\0${context.rootDir}`)},git:{available:context.git.available,branch:context.git.branch,dirty:context.git.dirty} };
}
function inScope(task: Pick<TaskDocument,"archivedAt">, scope: WorkspaceScope): boolean { return scope==="all" || (scope==="archived" ? Boolean(task.archivedAt) : !task.archivedAt); }
function inWindow(task: Pick<TaskDocument,"completedAt"|"cancelledAt">, window: WorkspaceWindow | undefined, now: number): boolean {
  if(!window)return true;
  const timestamp=task.completedAt??task.cancelledAt;
  const value=timestamp?Date.parse(timestamp):NaN;
  return Number.isFinite(value)&&value>=now-Number.parseInt(window)*86_400_000;
}
function matchesText(row:{id:string;title:string;summary:string}, query:string): boolean {
  return !query || normalizeWorkspaceSearch(`${row.id}\n${row.title}\n${row.summary}`).includes(normalizeWorkspaceSearch(query));
}
function compareValue(left:unknown,right:unknown,direction:"asc"|"desc"):number {
  const empty=(value:unknown)=>value===undefined||value===null||value===""||(typeof value==="number"&&!Number.isFinite(value));
  if(empty(left)||empty(right))return empty(left)===empty(right)?0:empty(left)?1:-1;
  const order=typeof left==="number"&&typeof right==="number"?left-right:compareText(normalizeWorkspaceSearch(String(left)),normalizeWorkspaceSearch(String(right)));
  return direction==="desc"?-order:order;
}
function sortRows<Row extends {id:string}>(rows:Row[],sort:WorkspaceSort[],value:(row:Row,key:string)=>unknown):Row[] {
  const dates=new Set(["updatedAt","createdAt","completedAt","cancelledAt"]);
  const read=(row:Row,key:string)=>{
    const raw=value(row,key);
    if(!dates.has(key))return raw;
    const timestamp=typeof raw==="string"?Date.parse(raw):NaN;
    return Number.isFinite(timestamp)?timestamp:undefined;
  };
  return rows.sort((left,right)=>{for(const item of sort){const order=compareValue(read(left,item.key),read(right,item.key),item.direction);if(order)return order;}return compareText(left.id,right.id);});
}
function paginate<Row,Query extends WorkspaceListQuery>(source:WorkspaceSource,rows:Row[],query:Query,totalInScope:number):WorkspaceListResult<Row,Query> {
  const page=Math.min(query.page,Math.max(1,Math.ceil(rows.length/query.pageSize)));
  const normalizedQuery={...query,page};
  const selected=rows.slice((page-1)*query.pageSize,page*query.pageSize);
  return {rows:selected,totalMatching:rows.length,totalInScope,page,requestedPage:query.page,pageSize:query.pageSize,normalizedQuery,generatedAt:generatedAt(source),revision:digest(JSON.stringify([source.revision,normalizedQuery,selected,rows.length,totalInScope]))};
}
export function queryWorkspaceTasks(source:WorkspaceSource,query:WorkspaceTaskQuery):WorkspaceListResult<WorkspaceTaskRow,WorkspaceTaskQuery> {
  const scoped=[...source.taskRows().values()].filter(task=>inScope(task,query.scope));
  const selected=new Set(query.specIds);
  const rows=scoped.filter(task=>(!selected.size||task.specIds.some(id=>selected.has(id)))&&(!query.statuses.length||query.statuses.includes(task.effectiveStatus))&&(!query.priorities.length||query.priorities.includes(task.priority))&&inWindow(task,query.window,source.now)&&matchesText(task,query.q));
  sortRows(rows,query.sort,(row,key)=>key==="status"?TASK_STATUSES.indexOf(row.effectiveStatus):key==="spec"?row.specIds[0]:key==="blocked"?row.unmetDependencies.length:key==="dependencies"?row.dependsOn.length:key==="downstream"?row.downstreamCount:row[key as keyof WorkspaceTaskRow]);
  return paginate(source,rows,query,scoped.length);
}
export function queryWorkspaceSpecs(source:WorkspaceSource,query:WorkspaceSpecQuery):WorkspaceListResult<WorkspaceSpecRow,WorkspaceSpecQuery> {
  const selected=new Set(query.specIds);
  const taskRows=source.taskRows();
  const rows=source.context.specs.filter(spec=>(!selected.size||selected.has(spec.id))&&(!query.statuses.length||query.statuses.includes(spec.status))&&matchesText(spec,query.q)).map(spec=>{
    // spec.taskIds remains the canonical relation, including asymmetric task metadata.
    const linked=spec.taskIds.map(id=>taskRows.get(id)).filter((task):task is WorkspaceTaskRow=>Boolean(task)).filter(task=>inScope(task,query.taskScope)&&inWindow(task,query.window,source.now));
    return {id:spec.id,title:spec.title,summary:spec.summary,status:spec.status,taskIds:linked.map(t=>t.id),linkedTaskCount:linked.length,progress:buildSpecProgress(linked),owner:spec.owner,updatedAt:spec.updatedAt,tags:spec.tags};
  });
  sortRows(rows,query.sort,(row,key)=>key==="status"?SPEC_STATUSES.indexOf(row.status):key==="progress"?row.progress.completionRatio:key==="tasks"?row.linkedTaskCount:key==="blocked"?row.progress.blocked:key==="review"?row.progress.review:row[key as keyof WorkspaceSpecRow]);
  return paginate(source,rows,query,source.context.specs.length);
}
export function queryWorkspaceOptions(source:WorkspaceSource,query:WorkspaceOptionsQuery):WorkspaceOptionsResult {
  const q=normalizeWorkspaceSearch(query.q);
  const matches=source.context.specs.filter(spec=>!q||normalizeWorkspaceSearch(`${spec.id}\n${spec.title}`).includes(q)).sort((a,b)=>compareText(a.id,b.id));
  const page=Math.min(query.page,Math.max(1,Math.ceil(matches.length/query.pageSize)));
  let titleBytes=0;
  const projected=new Map<string,WorkspaceSpecOption>();
  const option=(spec:SpecDocument):WorkspaceSpecOption=>{
    const existing=projected.get(spec.id);if(existing)return existing;
    const bytes=Buffer.byteLength(spec.title);
    const row:WorkspaceSpecOption=bytes>8192||titleBytes+bytes>32768?{id:spec.id,status:spec.status,labelOmitted:true,reason:"title-budget"}:{id:spec.id,title:spec.title,status:spec.status};
    if(row.title)titleBytes+=bytes;
    projected.set(spec.id,row);return row;
  };
  const selected=query.selectedIds.map(id=>source.specById.get(id)).filter((spec):spec is SpecDocument=>Boolean(spec)).map(option);
  const options=matches.slice((page-1)*query.pageSize,page*query.pageSize).map(option);
  return {options,selected,totalMatching:matches.length,page,pageSize:query.pageSize,q:query.q,revision:digest(JSON.stringify([source.revision,query,options,selected]))};
}
function filters(source:WorkspaceSource,view:WorkspaceViewQuery,requestedSpecIds:string[]):WorkspaceFilterData {
  const query=view.list??view.timeline!;
  const scope=query && "kind" in query ? query.kind==="task"?query.scope:query.taskScope : view.timeline?.scope??"all";
  return {selectedSpecIds:query?.specIds??[],unavailableSpecIds:requestedSpecIds.filter(id=>!source.knownSpecIds.has(id)),timeWindow:query?.window,hasActiveFilters:Boolean(query?.specIds.length||query?.window||(view.list?.statuses.length)),includesArchived:scope!=="unarchived",legacyArchive:Boolean(query&&"legacyArchive"in query&&query.legacyArchive),scope,options:queryWorkspaceOptions(source,view.options)};
}
export async function buildWorkspaceOverview(source:WorkspaceSource):Promise<WorkspaceOverviewData> {
  const {context}=source;
  const [report,snapshot]=await Promise.all([buildAgentsHealthReport(context.rootDir),Promise.resolve().then(()=>deriveStatusSnapshot(context))]);
  const identity=(task:TaskDocument)=>({id:task.id,title:task.title});
  return {
    counts:{specs:snapshot.specCount,tasks:snapshot.taskCount,activeSpecs:snapshot.activeSpecIds.length,inProgressTasks:snapshot.inProgressTasks.length,reviewTasks:snapshot.reviewTasks.length,blockedTasks:snapshot.blockedTasks.length,readyTasks:snapshot.readyTasks.length},
    currentState:{summary:context.currentState.summary,focus:context.currentState.focus,activeSpecIds:snapshot.activeSpecIds,activeTaskIds:snapshot.activeTaskIds,nextActionHints:context.currentState.nextActionHints,updatedAt:context.currentState.updatedAt},
    nextActions:deriveNextActions(context,snapshot),agents:{ok:report.summary.ok,maxFileTokens:report.summary.maxFileTokens,maxChainTokens:report.summary.maxChainTokens,failures:report.failures},
    blockedTasks:snapshot.blockedTasks.filter(t=>!t.task.archivedAt).map(t=>identity(t.task)),reviewTasks:snapshot.reviewTasks.filter(t=>!t.task.archivedAt).map(t=>identity(t.task)),criticalPath:snapshot.criticalPath.filter(t=>!t.archivedAt).map(identity),dependencyIssues:snapshot.missingDependencies,
    ...(snapshot.recentHandoff?{recentHandoff:{id:snapshot.recentHandoff.id,title:snapshot.recentHandoff.title,summary:snapshot.recentHandoff.summary,createdAt:snapshot.recentHandoff.createdAt}}:{}),
    specs:context.specs.map(spec=>({id:spec.id,linkedTaskCount:spec.taskIds.filter(id=>source.analysis.byId.has(id)).length})),
  };
}
export async function buildWorkspaceEnvelope<Route extends WorkspaceRoute>(source:WorkspaceSource,route:Route,params:URLSearchParams):Promise<WorkspaceEnvelope<Route>> {
  const view=normalizeViewQuery(route,params,source.knownSpecIds);
  const intent=normalizeViewQuery(route,params);
  const requestedSpecIds=intent.list?.specIds??intent.timeline?.specIds??[];
  const requestKey=workspaceRequestKey(route,params);
  // Board is the temporary presentation until P3. It cannot claim archived records.
  if(view.list?.kind==="task"&&view.view==="board")view.list.scope="unarchived";
  let data:WorkspaceRouteData[WorkspaceRoute];
  if(route==="tasks") data={view:view.view??"table",result:queryWorkspaceTasks(source,view.list as WorkspaceTaskQuery),filters:filters(source,view,requestedSpecIds)};
  else if(route==="specs") data={result:queryWorkspaceSpecs(source,view.list as WorkspaceSpecQuery),filters:filters(source,view,requestedSpecIds),progressIsSubset:Boolean((view.list as WorkspaceSpecQuery).window||(view.list as WorkspaceSpecQuery).taskScope!=="all")};
  else if(route==="timeline") {
    const query=view.timeline!;
    const selected=new Set(query.specIds);
    const cards=[...source.taskRows().values()].filter(task=>inScope(task,query.scope)&&(!selected.size||task.specIds.some(id=>selected.has(id)))&&inWindow(task,query.window,source.now));
    data={timeline:buildTimelineProjection(cards,source.context.specs.map(spec=>({id:spec.id,title:spec.title,status:spec.status})),{selectedSpecIds:query.specIds,mode:query.mode,selectedTaskId:query.selectedTaskId}),filters:filters(source,view,requestedSpecIds)};
  } else data=await buildWorkspaceOverview(source);
  return {schemaVersion:1,route,requestKey,revision:digest(JSON.stringify([source.revision,requestKey,data],(key,value)=>key==="generatedAt"?undefined:value)),generatedAt:generatedAt(source),shell:buildWorkspaceShell(source),data} as WorkspaceEnvelope<Route>;
}
