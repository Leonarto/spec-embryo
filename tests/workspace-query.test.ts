import { describe, expect, test } from "bun:test";
import { normalizeViewQuery, parseWorkspaceListQuery, parseWorkspaceTimelineQuery, serializeViewQuery, serializeWorkspaceListQuery, transitionViewQuery, workspaceRequestKey } from "../src/services/workspace-query.ts";

const params=(text:string)=>new URLSearchParams(text);
describe("workspace query contracts",()=>{
  test("request identity normalizes aliases/syntax independently of dataset availability",()=>{
    expect(workspaceRequestKey('specs',params('spec=SPEC-001&spec_status=done'))).toBe(workspaceRequestKey('specs',params('status=done&spec=SPEC-001')));
    expect(workspaceRequestKey('tasks',params('view=board&scope=archived&page=2'))).toBe(workspaceRequestKey('tasks',params('view=board&scope=unarchived&page=2')));
    expect(workspaceRequestKey('tasks',params('page=2'))).not.toBe(workspaceRequestKey('tasks',params('page=1')));
    expect(workspaceRequestKey('tasks',params('spec=SPEC-001'))).not.toBe(workspaceRequestKey('tasks',params('spec=SPEC-002')));
  });
  test("defaults Tasks to Table, retains archive scope, and simple mode forces Table",()=>{
    expect(normalizeViewQuery('tasks',params('')).view).toBe('table');
    expect(workspaceRequestKey('tasks',params('scope=all'))).not.toBe(workspaceRequestKey('tasks',params('scope=archived')));
    expect(normalizeViewQuery('tasks',params('view=board&simple=1')).view).toBe('table');
    for(const view of ['board','table']){const q=normalizeViewQuery('tasks',params(`view=${view}&scope=all`));expect(normalizeViewQuery('tasks',serializeViewQuery(q))).toEqual(q);}
    expect(normalizeViewQuery('specs',params('view=board')).view).toBeUndefined();
  });
  test("round trips non-default option page sizes without changing normalized identity",()=>{
    for(const route of ['tasks','specs','timeline'] as const){
      const original=normalizeViewQuery(route,params('option_q=match&option_page=2&option_pageSize=100'));
      expect(normalizeViewQuery(route,serializeViewQuery(original,true))).toEqual(original);
    }
  });
  test("normalizes malformed values, duplicate facets, and at most two distinct sort keys",()=>{
    const q=parseWorkspaceListQuery("task",params('spec=SPEC-001,SPEC-002&spec=SPEC-001&spec=../x&status=todo,blocked&status=bogus&priority=-1,0,1.5,NaN,Infinity&priority=1.50&sort=priority.desc,title.asc,id.desc&sort=priority.asc&page=-1&pageSize=999&q=++Ａlpha+++Beta++'),new Set(['SPEC-001']));
    expect(q).toEqual({kind:'task',q:'Ａlpha Beta',specIds:['SPEC-001'],statuses:['todo','blocked'],priorities:[-1,0,1.5],scope:'unarchived',sort:[{key:'priority',direction:'desc'},{key:'title',direction:'asc'}],page:1,pageSize:100});
    expect(parseWorkspaceListQuery('task',params('page=2.5&pageSize=50&priority=1e2&priority='))).toMatchObject({page:1,pageSize:50,priorities:[100]});
    expect(parseWorkspaceListQuery('spec',params('priority=2&scope=archived&status=done&status=cancelled&spec_status=archived'))).toMatchObject({kind:'spec',taskScope:'all',statuses:['done','archived']});
  });
  test("round trips every scoped task/spec query and keeps exclusive fields apart",()=>{
    for(const kind of ['task','spec'] as const)for(const scope of ['all','archived','unarchived']){
      const input=params(`q=alpha&spec=SPEC-001&status=done&scope=${scope}&taskScope=${scope}&priority=-0.5&sort=title.desc&sort=id.asc&page=4&pageSize=200&window=30d`);
      const q=kind==='task'?parseWorkspaceListQuery('task',input):parseWorkspaceListQuery('spec',input);
      const serialized=serializeWorkspaceListQuery(q);
      expect(kind==='task'?parseWorkspaceListQuery('task',serialized):parseWorkspaceListQuery('spec',serialized)).toEqual(q);
      expect(serialized.has(kind==='task'?'taskScope':'scope')).toBe(false);
      if(kind==='spec')expect(serialized.has('priority')).toBe(false);
    }
  });
  test("preserves legacy archive semantics until new interactions write scope explicitly",()=>{
    for(const legacy of ['spec=SPEC-001','window=7d','spec=SPEC-001&window=90d']){
      expect(parseWorkspaceListQuery('spec',params(legacy))).toMatchObject({taskScope:'all',legacyArchive:true});
      expect(parseWorkspaceTimelineQuery(params(legacy))).toMatchObject({scope:'all',legacyArchive:true});
      const old=normalizeViewQuery('specs',params(legacy));
      expect(normalizeViewQuery('specs',serializeViewQuery(old,true)).list).toEqual(old.list);
      expect(normalizeViewQuery('specs',serializeViewQuery(old)).list).toMatchObject({legacyArchive:false,taskScope:'all'});
    }
    expect(parseWorkspaceTimelineQuery(params(''))).toMatchObject({scope:'unarchived',legacyArchive:false});
    expect(parseWorkspaceTimelineQuery(params('spec=SPEC-001&scope=unarchived'))).toMatchObject({scope:'unarchived',legacyArchive:false});
  });
  test("allows only compatible inspector/trace/presentation fields per route",()=>{
    const view=normalizeViewQuery('tasks',params('inspect=task:TASK-001&section=relations&selected_task=TASK-002&scope=all&taskScope=archived&foo=x&option_q=find&option_page=3'));
    const encoded=serializeViewQuery(view);
    expect(encoded.get('inspect')).toBe('task:TASK-001');
    expect(encoded.get('section')).toBe('relations');
    expect(encoded.has('selected_task')).toBe(false);
    expect(encoded.has('taskScope')).toBe(false);
    expect(encoded.has('foo')).toBe(false);
    expect(normalizeViewQuery('specs',params('inspect=task:../../secret&section=document')).inspect).toBeUndefined();
    expect(normalizeViewQuery('tasks',params('inspect=task:TASK-001&section=questions')).section).toBeUndefined();
    expect(normalizeViewQuery('tasks',params('inspect=spec:SPEC-001&section=questions')).section).toBe('questions');
    const moved=transitionViewQuery('specs',params('spec=SPEC-001&sort=priority.desc&page=5&selected_task=TASK-002&inspect=task:TASK-001'));
    expect(moved.getAll('spec')).toEqual(['SPEC-001']);expect(moved.get('page')).toBe('1');expect(moved.get('sort')).toBe('status.asc');expect(moved.has('inspect')).toBe(false);expect(moved.has('selected_task')).toBe(false);
  });
});
