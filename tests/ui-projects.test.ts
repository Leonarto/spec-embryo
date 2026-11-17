import {test,expect} from 'bun:test';
import {mkdtemp,rm,writeFile,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {initializeProject} from '../src/repository.ts';
import {loadPortfolioRegistry,registerPortfolioProject,linkPortfolioProject} from '../src/services/portfolio.ts';
import {expectedWorkspaceStatus,registrationAllowed,resolveUiProject} from '../src/services/ui-projects.ts';

test('registry updates preserve identity and reject collisions; concurrent writers serialize',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'spm-projects-'));try{
  const a=join(dir,'a'),b=join(dir,'b'),alias=join(dir,'alias'),registryFile=join(dir,'registry.json');await initializeProject(a);await initializeProject(b);await symlink(a,alias);
  await registerPortfolioProject(a,{registryFile,id:'a',name:'A',tags:['first']});await linkPortfolioProject('a',{registryFile,dependsOn:['b']});
  const repeated=await registerPortfolioProject(alias,{registryFile,tags:['second']});expect(repeated.project).toMatchObject({id:'a',name:'A',tags:['first','second'],dependsOn:['b']});
  await expect(registerPortfolioProject(a,{registryFile,id:'other'})).rejects.toThrow('conflicts');await expect(registerPortfolioProject(b,{registryFile,id:'a'})).rejects.toThrow('conflicts');
  await Promise.all([registerPortfolioProject(a,{registryFile,name:'Updated'}),registerPortfolioProject(b,{registryFile,id:'b'})]);expect((await loadPortfolioRegistry(registryFile)).projects.map(p=>p.id)).toEqual(['a','b']);
  await registerPortfolioProject(a,{registryFile,tags:Array.from({length:254},(_,i)=>`tag-${i}`)});
  await expect(registerPortfolioProject(a,{registryFile,tags:['overflow']})).rejects.toThrow('Too many tags');expect((await loadPortfolioRegistry(registryFile)).projects[0]!.tags).toHaveLength(256);
  await expect(registerPortfolioProject(join(dir,'absent'),{registryFile})).rejects.toThrow();
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('request selection and stale identity fail closed without exposing paths',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'spm-selection-'));try{
  const a=join(dir,'a'),b=join(dir,'b'),registryFile=join(dir,'registry.json');await initializeProject(a);await initializeProject(b);await registerPortfolioProject(b,{registryFile,id:'b',name:'Bee'});
  const root=await resolveUiProject(new URLSearchParams(),a,registryFile),selected=await resolveUiProject(new URLSearchParams('project=b'),a,registryFile);
  expect(selected.projects).toEqual([{id:'b',name:'Bee'}]);expect(selected.workspaceKey).not.toBe(root.workspaceKey);expect(expectedWorkspaceStatus(selected,null)).toBe(400);expect(expectedWorkspaceStatus(selected,root.workspaceKey)).toBe(409);expect(expectedWorkspaceStatus(selected,selected.workspaceKey)).toBe(0);expect(expectedWorkspaceStatus(root,null)).toBe(0);
  for(const q of ['project=','project=missing','project=b&project=b','project=%2Ftmp'])await expect(resolveUiProject(new URLSearchParams(q),a,registryFile)).rejects.toThrow();
  await writeFile(registryFile,'bad');expect((await resolveUiProject(new URLSearchParams(),a,registryFile)).registryError).toBeDefined();await expect(resolveUiProject(new URLSearchParams('project=b'),a,registryFile)).rejects.toThrow();
  for(const host of ['127.0.0.1','::1'])expect(registrationAllowed(host)).toBe(true);for(const host of [undefined,'localhost','0.0.0.0','example.com','127.0.0.999'])expect(registrationAllowed(host)).toBe(false);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('stale answer identity retains drafts without calling the writer',async()=>{
 const {submitSpecAnswers}=await import('../web/src/lib/server/spec-answers.ts');
 const form=new FormData();form.append('question','Why?');form.append('answer','Because');form.append('specRevision','a'.repeat(64));let writes=0;
 const outcome=await submitSpecAnswers('/unused','SPEC-001',form,()=>{},{load:async()=>{throw new Error('must not load');},write:async()=>{writes++;throw new Error('must not write');}} as never,409);
 expect(outcome.status).toBe(409);expect(outcome.result.workspaceMismatch).toBe(true);expect(outcome.result.submittedDrafts).toEqual([{question:'Why?',answer:'Because'}]);expect(writes).toBe(0);
});

test('remapped selection returns recovery-only action data and never writes either repo',async()=>{
 const {actions,load}=await import('../web/src/routes/specs/[specId]/+page.server.ts');
 const {load:layout}=await import('../web/src/routes/+layout.server.ts');
 const dir=await mkdtemp(join(tmpdir(),'spm-remap-'));try{
  const a=join(dir,'a'),b=join(dir,'b'),registryFile=join(dir,'registry.json');await initializeProject(a);await initializeProject(b);
  await registerPortfolioProject(a,{registryFile,id:'same'});const old=await resolveUiProject(new URLSearchParams('project=same'),a,registryFile);
  const registry=await loadPortfolioRegistry(registryFile);registry.projects[0]!.path=b;await writeFile(registryFile,JSON.stringify(registry));
  const selected=await resolveUiProject(new URLSearchParams('project=same'),a,registryFile);expect(expectedWorkspaceStatus(selected,old.workspaceKey)).toBe(409);
  const form=new FormData();form.set('expectedWorkspaceKey',old.workspaceKey);form.append('question','Shared?');form.append('answer','draft');form.append('specRevision','a'.repeat(64));
  const locals={projectSelection:selected};const result=await (actions.answerOpenQuestions as Function)({params:{specId:'SPEC-001'},request:new Request('http://localhost/specs/SPEC-001?/answerOpenQuestions',{method:'POST',body:form}),locals});
  expect(result.status).toBe(409);expect(result.data.workspaceMismatch).toBe(true);expect(result.data.submittedDrafts).toEqual([{question:'Shared?',answer:'draft'}]);
  const page=await (load as Function)({params:{specId:'SPEC-001'},locals,url:new URL('http://localhost/specs/SPEC-001')});expect(page.detail).toBeNull();expect(page.answerOutcome.workspaceMismatch).toBe(true);
  const shell=await (layout as Function)({locals,url:new URL('http://localhost/specs/SPEC-001')});expect(shell.postAnswerRecovery).toBe(true);expect(shell.shell).toBeNull();
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('concurrent registration and linking preserve both changes and malformed registries fail closed',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'spm-link-race-'));try{
  const a=join(dir,'a'),b=join(dir,'b'),registryFile=join(dir,'registry.json');await initializeProject(a);await initializeProject(b);await registerPortfolioProject(a,{registryFile,id:'a'});
  await Promise.all([linkPortfolioProject('a',{registryFile,dependsOn:['b']}),registerPortfolioProject(b,{registryFile,id:'b'})]);const result=await loadPortfolioRegistry(registryFile);expect(result.projects).toHaveLength(2);expect(result.projects.find(p=>p.id==='a')!.dependsOn).toEqual(['b']);
  for(const bad of [{version:2,projects:[]},{version:1,projects:[result.projects[0],result.projects[0]]},{version:1,projects:[{...result.projects[0],path:'relative'}]}]){await writeFile(registryFile,JSON.stringify(bad));await expect(loadPortfolioRegistry(registryFile)).rejects.toThrow();}
  await writeFile(registryFile,' '.repeat(1024*1024+1));await expect(loadPortfolioRegistry(registryFile)).rejects.toThrow();
 }finally{await rm(dir,{recursive:true,force:true});}
});
