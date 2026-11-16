import type {DetailRelatedHandoff,SpecDetailData,SpecDetailResult,TaskDetailData,TaskDetailResult} from './details.ts';
export const relationPageSize=100 as const;
export const taskRelations=['dependencies','blockingTasks','unmetDependencyIds','linkedSpecs','relatedHandoffs'] as const;
export const specRelations=['linkedTasks','relatedHandoffs'] as const;
export type DetailRelation=typeof taskRelations[number]|typeof specRelations[number];
export type RelationPages=Partial<Record<DetailRelation,number>>;
export interface RelationWindow<Item>{page:number;pageSize:100;total:number;totalPages:number;items:Item[]}
export interface TaskRelationRow {id:string;title:string;summary:string}
export interface SpecTaskRelationRow extends TaskRelationRow {statusLabel:string;priority:number;effort:number;archivedAt?:string;groupId:string;groupTitle:string}
export interface DetailMissing {found:false;kind:'task'|'spec';id:string}
export type BoundedTaskDetail=Omit<TaskDetailData,'dependencies'|'blockingTasks'|'unmetDependencyIds'|'linkedSpecs'|'relatedHandoffs'> & {
 dependencies:RelationWindow<TaskRelationRow>;blockingTasks:RelationWindow<TaskRelationRow>;unmetDependencyIds:RelationWindow<string>;linkedSpecs:RelationWindow<{id:string}>;relatedHandoffs:RelationWindow<DetailRelatedHandoff>;
};
export type BoundedSpecDetail=Omit<SpecDetailData,'linkedTasks'|'linkedTaskGroups'|'relatedHandoffs'> & {
 linkedTasks:RelationWindow<SpecTaskRelationRow>;linkedTaskGroups:Array<{id:string;title:string;total:number}>;relatedHandoffs:RelationWindow<DetailRelatedHandoff>;
};
export type BoundedTaskResult=BoundedTaskDetail|DetailMissing;
export type BoundedSpecResult=BoundedSpecDetail|DetailMissing;
export function relationsFor(kind:'task'|'spec'):readonly DetailRelation[]{return kind==='task'?taskRelations:specRelations;}
export function isDetailRelation(kind:'task'|'spec',value:unknown):value is DetailRelation{return typeof value==='string'&&relationsFor(kind).includes(value as DetailRelation);}
export function normalizeRelationPage(value:unknown):number {
 const page=typeof value==='number'?value:typeof value==='string'&&/^[0-9]+$/.test(value)?Number(value):NaN;
 return Number.isSafeInteger(page)&&page>0?page:1;
}
/** Desired URL intent, independent of collection lengths and accepted windows. */
export function parseRelationPages(kind:'task'|'spec',params:URLSearchParams):RelationPages {
 const pages:RelationPages={};for(const relation of relationsFor(kind))pages[relation]=normalizeRelationPage(params.get(`rel.${relation}`));return pages;
}
export function relationPagesKey(kind:'task'|'spec',pages:RelationPages={}):string {return JSON.stringify(relationsFor(kind).map(name=>[name,normalizeRelationPage(pages[name])]));}
export function clearRelationPages(params:URLSearchParams):void {for(const key of [...params.keys()])if(key.startsWith('rel.'))params.delete(key);}
export function setRelationPage(params:URLSearchParams,relation:DetailRelation,page:number):void {const value=normalizeRelationPage(page);if(value===1)params.delete(`rel.${relation}`);else params.set(`rel.${relation}`,String(value));}
export function writeRelationPages(params:URLSearchParams,kind:'task'|'spec',pages:RelationPages):void {clearRelationPages(params);for(const relation of relationsFor(kind))setRelationPage(params,relation,pages[relation]??1);}
export function relationPageHref(value:string|URL,relation:DetailRelation,page:number):string {const url=new URL(value);setRelationPage(url.searchParams,relation,page);return url.href;}
export function windowRelation<Item>(items:readonly Item[],requested:unknown):RelationWindow<Item>{
 const total=items.length,totalPages=Math.max(1,Math.ceil(total/relationPageSize)),page=Math.min(normalizeRelationPage(requested),totalPages);
 return {page,pageSize:relationPageSize,total,totalPages,items:items.slice((page-1)*relationPageSize,page*relationPageSize)};
}
const taskRow=({id,title,summary}:TaskRelationRow):TaskRelationRow=>({id,title,summary});
export function boundTaskDetail(full:TaskDetailResult,pages:RelationPages={},allHandoffs?:DetailRelatedHandoff[]):BoundedTaskResult {
 if(!full.found)return {kind:full.kind,found:false,id:full.id};
 // Destructure every full collection: never spread a full legacy array into transport.
 const {dependencies,blockingTasks,unmetDependencyIds,linkedSpecs,relatedHandoffs,...metadata}=full;
 const dependenciesWindow=windowRelation(dependencies,pages.dependencies),blockingWindow=windowRelation(blockingTasks,pages.blockingTasks);
 const specsWindow=windowRelation(linkedSpecs,pages.linkedSpecs);
 return {...metadata,dependencies:{...dependenciesWindow,items:dependenciesWindow.items.map(taskRow)},blockingTasks:{...blockingWindow,items:blockingWindow.items.map(taskRow)},unmetDependencyIds:windowRelation(unmetDependencyIds,pages.unmetDependencyIds),linkedSpecs:{...specsWindow,items:specsWindow.items.map(({id})=>({id}))},relatedHandoffs:windowRelation(allHandoffs??relatedHandoffs,pages.relatedHandoffs)};
}
export function boundSpecDetail(full:SpecDetailResult,pages:RelationPages={},allHandoffs?:DetailRelatedHandoff[]):BoundedSpecResult {
 if(!full.found)return {kind:full.kind,found:false,id:full.id};
 const {linkedTasks:_linkedTasks,linkedTaskGroups,relatedHandoffs,...metadata}=full;
 const rows=linkedTaskGroups.flatMap(group=>group.tasks.map(task=>({id:task.id,title:task.title,summary:task.summary,statusLabel:task.statusLabel,priority:task.priority,effort:task.effort,...(task.archivedAt?{archivedAt:task.archivedAt}:{}),groupId:group.id,groupTitle:group.title})));
 return {...metadata,linkedTasks:windowRelation(rows,pages.linkedTasks),linkedTaskGroups:linkedTaskGroups.map(({id,title,tasks})=>({id,title,total:tasks.length})),relatedHandoffs:windowRelation(allHandoffs??relatedHandoffs,pages.relatedHandoffs)};
}
export function acceptedRelationPages(detail:BoundedTaskResult|BoundedSpecResult):RelationPages {
 if(!detail.found)return {};return Object.fromEntries(relationsFor(detail.kind).map(name=>[name,(detail as unknown as Record<string,RelationWindow<unknown>>)[name]!.page]));
}
