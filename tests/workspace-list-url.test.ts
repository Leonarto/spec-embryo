import {test,expect} from 'bun:test';
import {workspaceListURL,workspaceRequestKey} from '../src/services/workspace-query.ts';
test('detail relationship pages preserve list URL/draft intent',()=>{
  for(const route of ['tasks','specs','timeline'] as const){
    const a=new URL(`http://fixture/${route}?selected_task=TASK-1&page=3&inspect=task:TASK-2&section=relations&rel.blockingTasks.page=2&rel.unknown=x`);
    expect(workspaceListURL(a)).toBe(`http://fixture/${route}?selected_task=TASK-1&page=3`);
    expect(workspaceRequestKey(route,a.searchParams)).toBe(workspaceRequestKey(route,new URLSearchParams('selected_task=TASK-1&page=3')));
    expect(workspaceListURL('http://fixture/'+route+'?rel.a=1&rel.a=2&scope=all&unrelated=keep')).toBe('http://fixture/'+route+'?scope=all&unrelated=keep');
  }
});
