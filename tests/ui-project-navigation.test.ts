import {describe,expect,test} from 'bun:test';
import {projectAction,projectHeaders,projectHref,retainProject,repositoryTasksHref} from '../web/src/lib/workspace/project.ts';
import {retainListRelationIntent} from '../web/src/lib/inspector/list-relations.ts';

describe('project-aware navigation',()=>{
 test('preserves opaque IDs through links, normalized queries, hashes, and named actions',()=>{
  const source=new URL('http://local/tasks?project=team%2Fone+%26+two');
  expect(projectHref('/specs/SPEC-1?rel.tasks=2#questions',source)).toBe('/specs/SPEC-1?rel.tasks=2&project=team%2Fone+%26+two#questions');
  expect(projectAction('/specs/SPEC-1','answerOpenQuestions',source)).toBe('/specs/SPEC-1?/answerOpenQuestions&project=team%2Fone+%26+two');
  expect(retainListRelationIntent(source.searchParams,new URLSearchParams('page=2')).get('project')).toBe('team/one & two');
  expect(projectHeaders(source,'root-key')).toEqual({'x-spm-workspace-key':'root-key'});
 });
 test('keeps launch compatibility and does not silently normalize malformed selections',()=>{
  const launch=new URL('http://local/tasks');
  expect(projectHref('/tasks',launch)).toBe('/tasks');
  expect(projectAction('/specs/SPEC-1','answerOpenQuestions',launch)).toBe('/specs/SPEC-1?/answerOpenQuestions');
  expect(projectHeaders(launch,'root-key')).toEqual({});
  expect(repositoryTasksHref(null)).toBe('/tasks');
  expect(repositoryTasksHref('team/one')).toBe('/tasks?project=team%2Fone');
  const invalid=new URLSearchParams('project=a&project=b');
  expect(retainProject(invalid,new URLSearchParams()).getAll('project')).toEqual(['a','b']);
 });
});
