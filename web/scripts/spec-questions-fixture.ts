import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {initializeProject} from '../../src/repository.ts';
const root=await mkdtemp(join(tmpdir(),'spm-question-workflow-'));await initializeProject(root);
const memory=join(root,'docs/spm');
for(const kind of ['tasks','specs']){await rm(join(memory,kind),{recursive:true,force:true});await mkdir(join(memory,kind));}
const id=(kind:string,n:number)=>`${kind}-${String(n).padStart(5,'0')}`;
const document=(fields:Record<string,unknown>,body:string)=>`+++\n${Object.entries(fields).map(([key,value])=>`${key} = ${JSON.stringify(value)}`).join('\n')}\n+++\n\n${body}\n`;
for(let n=1;n<=6;n++)await writeFile(join(memory,'tasks',`${id('TASK',n)}.md`),document({doc_kind:'task',id:id('TASK',n),title:`Question fixture task ${n}`,summary:'Synthetic relation target.',status:'todo',priority:1,spec_ids:[id('SPEC',n)],depends_on:[],tags:['fixture']},'## Context\n\nSynthetic task.'));
for(let n=1;n<=12;n++)await writeFile(join(memory,'specs',`${id('SPEC',n)}.md`),document({doc_kind:'spec',id:id('SPEC',n),title:`Question fixture spec ${n}`,summary:'Synthetic guarded questions and durable recovery.',status:'active',task_ids:[id('TASK',1),id('TASK',2)],tags:['fixture']},'## Intent\n\nSynthetic question workflow; no private data.\n\n## Diagram\n\n```mermaid\nflowchart LR\n  Draft --> Review\n```\n\n## Open Questions\n\n- First durable question?\n- Second durable question?'));
await writeFile(join(root,'.spm-question-fixture.json'),JSON.stringify({purpose:'TASK-129 disposable browser verification',tasks:6,specs:12,questionsPerSpec:2}));
console.log(JSON.stringify({root,tasks:6,specs:12}));
