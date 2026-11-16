import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {initializeProject} from '../../src/repository.ts';
import {serializeTomlFrontmatter as document} from '../../src/frontmatter.ts';
// Synthetic documents only. Caller owns temporary root; no private project sessions.
const root=await mkdtemp('/private/tmp/spm-detail-relations-');await initializeProject(root);
const memory=join(root,'docs/spm');for(const kind of ['tasks','specs','handoffs']){await rm(join(memory,kind),{recursive:true,force:true});await mkdir(join(memory,kind));}
const id=(kind:string,n:number)=>`${kind}-${String(n).padStart(5,'0')}`;
const narrative=Array.from({length:12},(_,n)=>`## Reader section ${n+1}\n\n${'Complete source narrative and stable reader context. '.repeat(8)}`).join('\n\n')+'\n\n## Diagram\n\n```mermaid\nflowchart LR\n A[Source] --> B[Bounded reader]\n```';
const writes:Array<[string,string]>=[];
for(let n=1;n<=10000;n++)writes.push([join(memory,'tasks',id('TASK',n)+'.md'),document({doc_kind:'task',id:id('TASK',n),title:`Relation fixture task ${n}`,summary:`Full task summary ${n}`,status:'todo',priority:2,spec_ids:n===1?Array.from({length:251},(_,j)=>id('SPEC',j+1)):[id('SPEC',1+(n-1)%2000)],depends_on:n===2?[id('TASK',1),...Array.from({length:250},(_,j)=>id('TASK',j+3)),...Array.from({length:251},(_,j)=>`TASK-MISSING-${j}`)]:n>1?[id('TASK',1)]:[],blocked_by:[],tags:['fixture']},n<=2?narrative:'## Context\n\nSynthetic relation fixture.')]);
for(let n=1;n<=2000;n++)writes.push([join(memory,'specs',id('SPEC',n)+'.md'),document({doc_kind:'spec',id:id('SPEC',n),title:`Relation fixture spec ${n}`,summary:'Full spec narrative, complete questions and paged relations.',status:'active',task_ids:n===1?Array.from({length:10000},(_,j)=>id('TASK',j+1)):Array.from({length:5},(_,j)=>id('TASK',n+j*2000)),tags:['fixture']},n===1?narrative+'\n\n## Open Questions\n\n- Does the canonical answer remain durable?\n\n## Resolved Decisions\n\n- Keep all source text available.':n===2?'## Intent\n\nSynthetic spec.\n\n## Open Questions\n\n- Does the JS canonical POST stay singular?\n- Does the noJS canonical POST stay singular?':'## Intent\n\nSynthetic spec.')]);
for(let n=1;n<=201;n++)writes.push([join(memory,'handoffs',`HANDOFF-${String(n).padStart(3,'0')}.md`),document({doc_kind:'handoff',id:`HANDOFF-${String(n).padStart(3,'0')}`,title:`Related handoff ${n}`,summary:'Full handoff summary',created_at:'2026-11-15T12:00:00Z',active_task_ids:[id('TASK',1)],related_spec_ids:[id('SPEC',1)],tags:['fixture']},'Synthetic handoff.')]);
for(let n=0;n<writes.length;n+=100)await Promise.all(writes.slice(n,n+100).map(([path,text])=>writeFile(path,text)));
console.log(JSON.stringify({root,tasks:10000,specs:2000,handoffs:201,taskFanout:9999,specLinked:10000}));
