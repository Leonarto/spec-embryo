import {isDetailRelation,normalizeRelationPage,relationPagesKey,relationsFor,type DetailRelation,type RelationPages,type RelationWindow} from '../../../../src/services/detail-relations.ts';
import type {InspectorIdentity,WorkspaceDetailEnvelope,WorkspaceRelationEnvelope} from '../../../../src/services/workspace-detail.ts';
const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string');
const identified=(v:unknown)=>object(v)&&typeof v.id==='string'&&typeof v.title==='string';
const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
const count=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
function row(value:unknown,relation:DetailRelation):boolean {
 if(relation==='unmetDependencyIds')return typeof value==='string';
 if(!object(value)||typeof value.id!=='string')return false;
 if(relation==='linkedSpecs')return Object.keys(value).every(key=>key==='id');
 if(!identified(value)||typeof value.summary!=='string')return false;
 if(relation==='relatedHandoffs')return typeof value.createdAt==='string';
 if(relation==='linkedTasks')return typeof value.statusLabel==='string'&&finite(value.priority)&&finite(value.effort)&&typeof value.groupId==='string'&&typeof value.groupTitle==='string'&&(value.archivedAt===undefined||typeof value.archivedAt==='string')&&!('dependsOn' in value)&&!('specIds' in value);
 return Object.keys(value).every(key=>['id','title','summary'].includes(key));
}
export function validateRelationWindow(value:unknown,relation:DetailRelation):value is RelationWindow<unknown>{
 if(!object(value)||value.pageSize!==100||!count(value.total)||!count(value.page)||!count(value.totalPages)||value.page<1||value.totalPages!==Math.max(1,Math.ceil(value.total/100))||value.page>value.totalPages||!Array.isArray(value.items))return false;
 return value.items.length===Math.min(100,Math.max(0,value.total-(value.page-1)*100))&&value.items.every(item=>row(item,relation));
}
function validPages(value:unknown,identity:InspectorIdentity):value is RelationPages {
 return object(value)&&relationsFor(identity.kind).every(name=>value[name]===normalizeRelationPage(value[name]))&&Object.keys(value).every(name=>isDetailRelation(identity.kind,name));
}
export function validateDetailEnvelope(value:unknown,expected:InspectorIdentity,pages?:RelationPages):value is WorkspaceDetailEnvelope {
 if(!object(value)||value.schemaVersion!==2||value.kind!==expected.kind||value.id!==expected.id||typeof value.revision!=='string'||!value.revision||typeof value.generatedAt!=='string'||!Number.isFinite(Date.parse(value.generatedAt))||!validPages(value.pages,expected)||pages&&relationPagesKey(expected.kind,value.pages)!==relationPagesKey(expected.kind,pages)||!object(value.detail))return false;
 const suppliedPages=value.pages as RelationPages;const d=value.detail;if(d.kind!==expected.kind||typeof d.found!=='boolean')return false;
 if(!d.found)return d.id===expected.id&&!('availableIds' in d);
 const entity=expected.kind==='task'?d.task:d.spec;
 if(!identified(entity)||!object(entity)||entity.id!==expected.id||typeof entity.summary!=='string'||typeof entity.status!=='string'||!strings(entity.tags)||!object(d.currentState)||!['isActiveSpec','isActiveTask','isBlockedTask'].every(key=>typeof (d.currentState as Record<string,unknown>)[key]==='boolean')||typeof d.currentState.focus!=='string'||!relationsFor(expected.kind).every(name=>validateRelationWindow(d[name],name)&&(d[name] as RelationWindow<unknown>).page===Math.min(suppliedPages[name]!, (d[name] as RelationWindow<unknown>).totalPages))||!Array.isArray(d.bodySections)||!d.bodySections.every(section=>object(section)&&typeof section.heading==='string'&&finite(section.depth)&&Array.isArray(section.blocks)&&section.blocks.every(block=>object(block)&&['paragraph','list','code'].includes(block.kind as string)&&strings(block.lines)&&(block.language===undefined||typeof block.language==='string'))))return false;
 if(expected.kind==='task')return finite(entity.priority);
 return object(d.progress)&&['todo','inProgress','blocked','review','done','cancelled','completionRatio'].every(key=>finite((d.progress as Record<string,unknown>)[key]))&&Array.isArray(d.linkedTaskGroups)&&d.linkedTaskGroups.every(group=>object(group)&&typeof group.id==='string'&&typeof group.title==='string'&&count(group.total)&&!('tasks' in group))&&Array.isArray(d.openQuestions)&&d.openQuestions.every(question=>object(question)&&typeof question.id==='string'&&typeof question.question==='string')&&Array.isArray(d.resolvedDecisions)&&d.resolvedDecisions.every(decision=>object(decision)&&typeof decision.id==='string'&&typeof decision.answer==='string'&&(decision.question===undefined||typeof decision.question==='string'));
}
export function validateRelationEnvelope(value:unknown,expected:InspectorIdentity,relation:DetailRelation,requestedPage:number):value is WorkspaceRelationEnvelope {
 return object(value)&&value.schemaVersion===2&&value.kind===expected.kind&&value.id===expected.id&&value.relation===relation&&value.requestedPage===requestedPage&&typeof value.revision==='string'&&!!value.revision&&validateRelationWindow(value.window,relation)&&value.window.page===Math.min(requestedPage,value.window.totalPages);
}
