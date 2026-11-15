import {buildSpecDetailFromContext,buildTaskDetailFromContext,type SpecDetailResult,type TaskDetailResult} from './details.ts';
import {isWorkspaceEntityId} from './workspace-query.ts';
import type {WorkspaceSource} from './workspace.ts';
export interface InspectorIdentity {kind:'task'|'spec';id:string}
export type InspectorSection='overview'|'relations'|'document'|'questions'|'decisions';
interface DetailEnvelopeBase {schemaVersion:1;id:string;revision:string;generatedAt:string}
export type WorkspaceDetailEnvelope = DetailEnvelopeBase & ({kind:'task';detail:TaskDetailResult}|{kind:'spec';detail:SpecDetailResult});
export function parseInspectorIdentity(kind:unknown,id:unknown):InspectorIdentity|undefined {
  return (kind==='task'||kind==='spec')&&typeof id==='string'&&isWorkspaceEntityId(id,kind)?{kind,id}:undefined;
}
/** Shares the request-local canonical context/index with list and shell projection. */
export function buildWorkspaceDetailEnvelope(source:WorkspaceSource,identity:InspectorIdentity):WorkspaceDetailEnvelope {
  const common={schemaVersion:1 as const,id:identity.id,revision:source.revision,generatedAt:new Date(source.now).toISOString()};
  return identity.kind==='task'?{...common,kind:'task',detail:buildTaskDetailFromContext(source.context,identity.id,source.analysis)}:{...common,kind:'spec',detail:buildSpecDetailFromContext(source.context,identity.id,source.analysis)};
}
