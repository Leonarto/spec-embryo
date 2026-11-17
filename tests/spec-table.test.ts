import {describe,expect,test} from 'bun:test';
import {specColumns} from '../web/src/lib/components/data-table/spec-columns.ts';
import {defaultTablePreferences,parseTablePreferences,renderedColumns,tableStorageKey} from '../web/src/lib/components/data-table/preferences.ts';
import {idsToText,rowsToTsv} from '../web/src/lib/components/data-table/clipboard.ts';
import {reconcileSelection,toggleRowSelection} from '../web/src/lib/components/data-table/model.ts';
import {SPEC_SORT_KEYS} from '../src/services/workspace-query.ts';
import {buildWorkspaceEnvelope,createWorkspaceSource,type WorkspaceSpecRow} from '../src/services/workspace.ts';
import {graphContext,graphSpec,graphTask} from './fixtures/graph-inputs.ts';

const ctx=graphContext([
  graphTask('TASK-DONE',{status:'done',completedAt:'2026-11-14T00:00:00Z',archivedAt:'2026-11-14T00:00:00Z'}),
  graphTask('TASK-BLOCKED',{status:'blocked'}),graphTask('TASK-REVIEW',{status:'review'}),
],[graphSpec('SPEC-A',['TASK-DONE','TASK-BLOCKED','TASK-REVIEW'],{status:'archived',title:'=Formula\ttitle',owner:'Owner α',tags:['tag-a','tag-b']}),graphSpec('SPEC-B',[],{status:'active',title:'Second'})]);
const source=createWorkspaceSource(ctx,Date.parse('2026-11-15T12:00:00Z'));
const run=(query='')=>buildWorkspaceEnvelope(source,'specs',new URLSearchParams(query));
const column=(key:string)=>specColumns.find(column=>column.key===key)!;

describe('Specs consumer of the shared table',()=>{
  test('uses existing sort keys and DTO fields with fixed identity and optional metadata',async()=>{
    expect(specColumns.filter(column=>column.locked).map(column=>column.key)).toEqual(['select','id','title']);
    expect(specColumns.filter(column=>column.sortKey).every(column=>SPEC_SORT_KEYS.includes(column.sortKey as typeof SPEC_SORT_KEYS[number]))).toBe(true);
    expect(specColumns.filter(column=>column.defaultVisible===false).map(column=>column.key)).toEqual(['owner','updatedAt','tags']);
    const row=(await run()).data.result.rows.find(row=>row.id==='SPEC-A')!;
    expect(column('id').href?.(row)).toBe('/specs/SPEC-A');expect(column('title').href?.(row)).toBe('/specs/SPEC-A');
    expect(column('status').textValue(row)).toBe('Archived');expect(column('progress').textValue(row)).toBe('1 / 3');
    expect(column('blocked').textValue(row)).toBe('1');expect(column('review').textValue(row)).toBe('1');expect(column('tasks').textValue(row)).toBe('3');
    expect(column('owner').textValue(row)).toBe('Owner α');expect(column('tags').textValue(row)).toBe('tag-a, tag-b');expect(column('updatedAt').textValue(row)).toBe('—');
  });
  test('canonical spec status remains independent from linked-task archive/window subset progress',async()=>{
    const global=await run('status=archived&taskScope=all');expect(global.data.progressIsSubset).toBe(false);
    for(const [scope,expected] of [['all','1 / 3'],['unarchived','0 / 2'],['archived','1 / 1']]){
      const data=(await run(`status=archived&taskScope=${scope}`)).data,row=data.result.rows[0]!;
      expect(data.result.totalMatching).toBe(1);expect(row.status).toBe('archived');expect(column('status').textValue(row)).toBe('Archived');
      expect(column('progress').textValue(row)).toBe(expected);expect(data.progressIsSubset).toBe(scope!=='all');
    }
    const window=(await run('status=archived&taskScope=all&window=7d')).data;
    expect(window.progressIsSubset).toBe(true);expect(column('progress').textValue(window.result.rows[0]!)).toBe('1 / 1');
    const sorted=(await run('sort=progress.desc&sort=title.asc')).data.result.rows;expect(sorted.map(row=>row.id)).toEqual(['SPEC-A','SPEC-B']);
  });
  test('spec preferences are isolated and visible selected-row copy retains formula safeguards',async()=>{
    expect(tableStorageKey('project-a','spec')).not.toBe(tableStorageKey('project-a','task'));expect(tableStorageKey('project-a','spec')).not.toBe(tableStorageKey('project-b','spec'));
    const preferences=defaultTablePreferences(specColumns);expect(parseTablePreferences(null,specColumns)).toEqual(preferences);
    const rows=(await run('sort=id.asc')).data.result.rows;
    const selected=toggleRowSelection(rows.map(row=>row.id),new Set(),undefined,'SPEC-A').selected;
    const copied=rowsToTsv(rows,renderedColumns(preferences,specColumns,1200),row=>row.id,selected)!;
    expect(copied).toContain("'=Formula title");expect(copied).toContain('Archived');expect(copied).toContain('1 / 3');expect(copied).not.toContain('Second');
    expect(idsToText(rows,row=>row.id,selected)).toBe('SPEC-A');expect(reconcileSelection(['SPEC-B'],selected,'SPEC-A')).toEqual({selected:new Set(),anchor:undefined,removed:1});
  });
  test('0/1/200 spec projection inputs stay bounded and include zero-linked specs',async()=>{
    for(const count of [0,1,200]){
      const fixture=graphContext([],Array.from({length:count},(_,n)=>graphSpec(`SPEC-${n}`,[])));
      const data=(await buildWorkspaceEnvelope(createWorkspaceSource(fixture),'specs',new URLSearchParams('pageSize=200'))).data;
      expect(data.result.rows.length).toBe(count);expect(data.result.rows.every(row=>column('progress').textValue(row)==='0 / 0')).toBe(true);
    }
  });
});
