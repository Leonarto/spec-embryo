import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {initializeProject} from '../../src/repository.ts';
// Disposable, synthetic read-only UI fixture. Caller owns cleanup after review.
const root=await mkdtemp(join(tmpdir(),'spm-inspector-fixture-'));
await initializeProject(root);
const memory=join(root,'docs/spm');
for(const kind of ['tasks','specs']){await rm(join(memory,kind),{recursive:true,force:true});await mkdir(join(memory,kind));}
const id=(kind:string,n:number)=>`${kind}-${String(n).padStart(5,'0')}`;
const document=(data:Record<string,unknown>,body:string)=>`+++\n${Object.entries(data).map(([key,value])=>`${key} = ${JSON.stringify(value)}`).join('\n')}\n+++\n\n${body}\n`;
const narrative=Array.from({length:7},(_,i)=>`## Reader section ${i+1}\n\nThis synthetic narrative provides enough content to verify independent reader scroll, stable focus and responsive continuity. ${'Deterministic context remains available. '.repeat(6)}\n\n- Read-only relation context\n- No project mutation from the inspector`).join('\n\n');
const diagram='## Diagram\n\n```mermaid\nflowchart LR\n  A[Input] --> B[Canonical context]\n  B --> C[Inspector]\n```';
const statuses=['todo','in_progress','review','blocked','done','cancelled'];
const writes:Array<[string,string]>=[];
for(let n=1;n<=230;n++)writes.push([join(memory,'tasks',`${id('TASK',n)}.md`),document({doc_kind:'task',id:id('TASK',n),title:n===1?'Read shared context and preserve the reader across responsive inspector modes':n===3?'Long title · Unicode α Ω · '+ 'readable task context '.repeat(12):`Fixture task ${n}`,summary:`Synthetic inspector task ${n}.`,status:statuses[(n-1)%6],priority:1+n%3,spec_ids:[id('SPEC',1+(n-1)%12)],depends_on:n===1?[id('TASK',2)]:[],tags:['fixture','read-only'],created_at:'2026-11-01T12:00:00Z',updated_at:'2026-11-15T12:00:00Z',...(n>200?{archived_at:'2026-11-14T12:00:00Z'}:{}),...(n%6===5?{completed_at:'2026-11-14T12:00:00Z'}:{}),...(n%6===0?{cancelled_at:'2026-11-14T12:00:00Z'}:{})},n===1?`${narrative}\n\n${diagram}`:'## Context\n\nA synthetic linked task.')]);
for(let n=1;n<=12;n++)writes.push([join(memory,'specs',`${id('SPEC',n)}.md`),document({doc_kind:'spec',id:id('SPEC',n),title:`Inspector spec ${n}`,summary:'Synthetic spec with canonical questions and diagram.',status:'active',task_ids:Array.from({length:230},(_,i)=>i+1).filter(i=>n===1||1+(i-1)%12===n).map(i=>id('TASK',i)),tags:['fixture'],owner:'reviewer'},n===1?`${narrative}\n\n${diagram}\n\n## Open Questions\n\n- How does the canonical action remain singular?\n\n## Resolved Decisions\n\n- Preserve deterministic source ownership.`:'## Intent\n\nRead-only spec context.')]);
await Promise.all(writes.map(([path,body])=>writeFile(path,body)));
await writeFile(join(root,'.spm-inspector-fixture.json'),JSON.stringify({version:1,purpose:'TASK-128 synthetic UI verification',tasks:230,specs:12}));
console.log(JSON.stringify({root,tasks:230,specs:12,unarchivedTasks:200}));
