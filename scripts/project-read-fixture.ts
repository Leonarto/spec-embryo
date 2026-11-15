/** Synthetic 10k-task/2k-spec fanout fixture for project-read-benchmark.ts; prints its temp root. */
import {initializeProject} from '../src/repository.ts';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {serializeTomlFrontmatter} from '../src/frontmatter.ts';
const root=await mkdtemp('/private/tmp/spm-project-read-fixture-');await initializeProject(root);
for(const dir of ['tasks','specs']){await rm(join(root,'docs/spm',dir),{recursive:true});await mkdir(join(root,'docs/spm',dir));}
const id=(kind:string,n:number)=>`${kind}-${String(n).padStart(5,'0')}`,writes:Array<[string,string]>=[];
for(let n=1;n<=10000;n++)writes.push([join(root,'docs/spm/tasks',id('TASK',n)+'.md'),serializeTomlFrontmatter({doc_kind:'task',id:id('TASK',n),title:`Fanout task ${n} · dependents`,summary:'Representative product task with one dependency on the shared root; preserve full context.',status:'todo',priority:2,spec_ids:[id('SPEC',1+(n-1)%2000)],depends_on:n>1?[id('TASK',1)]:[],blocked_by:[],tags:[]},'Profile fixture narrative.')]);
for(let n=1;n<=2000;n++)writes.push([join(root,'docs/spm/specs',id('SPEC',n)+'.md'),serializeTomlFrontmatter({doc_kind:'spec',id:id('SPEC',n),title:`Profile spec ${n}`,summary:'Fixture',status:'active',task_ids:[0,1,2,3,4].map(i=>id('TASK',n+i*2000)),tags:[]},'Profile fixture narrative.')]);
for(let n=0;n<writes.length;n+=100)await Promise.all(writes.slice(n,n+100).map(([p,t])=>writeFile(p,t)));console.log(root);
