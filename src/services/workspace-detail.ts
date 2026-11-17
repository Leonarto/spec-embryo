import {buildRelatedHandoffsForSpec,buildRelatedHandoffsForTask,buildSpecDetailFromContext,buildTaskDetailFromContext} from './details.ts';
import {boundSpecDetail,boundTaskDetail,isDetailRelation,normalizeRelationPage,relationsFor,type BoundedSpecResult,type BoundedTaskResult,type DetailRelation,type RelationPages,type RelationWindow} from './detail-relations.ts';
import {isWorkspaceEntityId} from './workspace-query.ts';
import type {WorkspaceSource} from './workspace.ts';
export interface InspectorIdentity {kind:'task'|'spec';id:string}
export type InspectorSection='overview'|'relations'|'document'|'questions'|'decisions';
interface DetailEnvelopeBase {schemaVersion:2;id:string;revision:string;generatedAt:string;pages:RelationPages}
export type WorkspaceDetailEnvelope = DetailEnvelopeBase & ({kind:'task';detail:BoundedTaskResult}|{kind:'spec';detail:BoundedSpecResult});
export interface WorkspaceRelationEnvelope {schemaVersion:2;kind:'task'|'spec';id:string;relation:DetailRelation;requestedPage:number;revision:string;window:RelationWindow<unknown>}
export function parseInspectorIdentity(kind:unknown,id:unknown):InspectorIdentity|undefined {
 return (kind==='task'||kind==='spec')&&typeof id==='string'&&isWorkspaceEntityId(id,kind)?{kind,id}:undefined;
}
/** Shares the request-local canonical context/index; legacy full builders remain unchanged. */
export function buildWorkspaceDetailEnvelope(source:WorkspaceSource,identity:InspectorIdentity,pages:RelationPages={}):WorkspaceDetailEnvelope {
 const common={schemaVersion:2 as const,id:identity.id,revision:source.revision,generatedAt:new Date(source.now).toISOString(),pages:Object.fromEntries(relationsFor(identity.kind).map(name=>[name,normalizeRelationPage(pages[name])]))};
 const entity=identity.kind==='task'?source.context.tasks.find(task=>task.id===identity.id):source.context.specs.find(spec=>spec.id===identity.id);
 const handoffs=!entity?[]:identity.kind==='task'?buildRelatedHandoffsForTask(source.context,entity as import('../domain.ts').TaskDocument,Infinity):buildRelatedHandoffsForSpec(source.context,entity as import('../domain.ts').SpecDocument,Infinity);
 return identity.kind==='task'?{...common,kind:'task',detail:boundTaskDetail(buildTaskDetailFromContext(source.context,identity.id,source.analysis),pages,handoffs)}:{...common,kind:'spec',detail:boundSpecDetail(buildSpecDetailFromContext(source.context,identity.id,source.analysis),pages,handoffs)};
}
/** Relation transport never serializes document/metadata or parallel full collections. */
export function buildWorkspaceRelationEnvelope(source:WorkspaceSource,identity:InspectorIdentity,relation:DetailRelation,requestedPage:unknown):WorkspaceRelationEnvelope|undefined {
 if(!isDetailRelation(identity.kind,relation))return;
 const requested=normalizeRelationPage(requestedPage),envelope=buildWorkspaceDetailEnvelope(source,identity,{[relation]:requested});
 if(!envelope.detail.found)return;
 return {schemaVersion:2,kind:identity.kind,id:identity.id,relation,requestedPage:requested,revision:source.revision,window:(envelope.detail as unknown as Record<string,RelationWindow<unknown>>)[relation]!};
}
