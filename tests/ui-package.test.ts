import { afterEach, describe, expect, test } from "bun:test";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { builtinModules, createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { initializeProject, createSpec, createTask } from "../src/repository.ts";
import { sha256, uiOutputInventory, validateUiArtifacts } from "../src/services/ui-artifacts.ts";

// Explicit real-archive gate: the caller installs a fresh archive with production
// dependencies and makes the package read-only before supplying this root.
const packageRoot = process.env.SPM_UI_PACKAGE_ROOT;
const owned: string[] = [];
const children: ChildProcess[] = [];
afterEach(async () => { for (const child of children.splice(0)) if(child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); await Promise.all(owned.splice(0).map(path => rm(path,{recursive:true,force:true}))); });
async function freePort() { const server=createServer();await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));const port=(server.address() as {port:number}).port;await new Promise<void>(resolve=>server.close(()=>resolve()));return port; }
async function fixture(label: string) {
  const root = await mkdtemp(join(tmpdir(), `spm packed ${label} `)); owned.push(root); await initializeProject(root);
  const spec = await createSpec(root, { title: `${label} package fixture`, summary: `Only external ${label} fixture`, status: "active" });
  await writeFile(spec.filePath, `${await readFile(spec.filePath,"utf8")}\n## Open Questions\n\n- First?\n- Second?\n\n## Diagram\n\n\`\`\`mermaid\nflowchart LR\n  A[Packed] --> B[Runtime]\n\`\`\`\n`);
  const task = await createTask(root,{title:`${label} task`,summary:"External fixture",specIds:[spec.id]});
  return {root,spec,task};
}
async function launch(root: string, port: number) {
  const bin = join(packageRoot!, "../../.bin/spm");
  const child = spawn(bin,["ui","--port",String(port)],{cwd:root,stdio:["ignore","pipe","pipe"],env:{...process.env,SPM_SERVER_ORIGIN:"http://evil.example",ORIGIN:"http://evil.example",PORT:"9",HOST:"evil.example"}}); children.push(child);
  let output = "";
  const closed = new Promise<{code:number|null,signal:string|null}>(resolve => child.once("close",(code,signal)=>resolve({code,signal})));
  const ready = new Promise<string>((resolve,reject)=>{
    const receive=(chunk:Buffer)=>{output+=chunk.toString();const match=/Spec Embryo UI ready at (http:\/\/[^\s]+)\/ \(build ([a-f0-9]{64})\)/.exec(output);if(match)resolve(match[1]!);};
    child.stdout!.on("data",receive);child.stderr!.on("data",receive);child.once("error",reject);child.once("close",code=>reject(new Error(`Installed bin exited ${code}: ${output}`)));
  });
  return {child,closed,ready,output:()=>output};
}
function form(revision: string, answer="exact packed answer", recovery="retained recovery") {
  return new URLSearchParams({specRevision:revision,question:"First?",answer,recoveryQuestion:"Removed?",recoveryAnswer:recovery});
}
async function post(origin:string,id:string,data:URLSearchParams, suppliedOrigin: string|null=origin, enhanced=false) {
  const headers:Record<string,string>={"content-type":"application/x-www-form-urlencoded",accept:"text/html"};if(suppliedOrigin!==null)headers.origin=suppliedOrigin;if(enhanced){headers.accept="application/json";headers["x-sveltekit-action"]="true";}
  return fetch(`${origin}/specs/${id}?/answerOpenQuestions`,{method:"POST",headers,body:data,redirect:"manual"});
}
describe.skipIf(!packageRoot)("actual production archive UI",()=>{
 test("has exact output and explicit production dependency closure, no development imports",async()=>{
  const root=packageRoot!; expect((await lstat(root)).mode & 0o222).toBe(0);
  await expect(lstat(join(root,"web/.svelte-kit"))).rejects.toThrow();
  const manifest=await validateUiArtifacts(root);expect(manifest.outputs.length).toBeGreaterThan(10);
  const pkg=JSON.parse(await readFile(join(root,"package.json"),"utf8"));const require=createRequire(join(root,"package.json"));
  const ts=require("typescript") as typeof import("typescript"); const bare=new Set<string>(); const specs:string[]=[];
  for(const file of manifest.outputs.filter(file=>file.path.endsWith(".js")&&!file.path.startsWith("web/build/client/"))){
    const code=await readFile(join(root,file.path),"utf8");const ast=ts.createSourceFile(file.path,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    const collect=(node:import("typescript").Node)=>{
      let literal:import("typescript").Expression|undefined;
      if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node))literal=node.moduleSpecifier;
      if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)literal=node.arguments[0];
      if(literal&&ts.isStringLiteral(literal)){const spec=literal.text;specs.push(spec);if(!spec.startsWith(".")&&!builtinModules.includes(spec)&&!spec.startsWith("node:"))bare.add(spec);}
      ts.forEachChild(node,collect);
    };collect(ast);
  }
  for(const spec of bare){const name=spec.startsWith("@")?spec.split("/").slice(0,2).join("/"):spec.split("/")[0]!;expect(typeof pkg.dependencies[name]).toBe("string");expect(require.resolve(spec)).toBeTruthy();}
  expect(specs.some(spec=>spec.endsWith(".ts")||spec.endsWith(".svelte")||spec.includes(".svelte-kit")||spec.includes("/src/")||spec==="vite"||spec.includes("vite/"))).toBe(false);
  console.log(`Packed server bare production imports: ${[...bare].sort().join(", ")||"none (bundled)"}`);
 });
 test("runs the real bin in two external roots with SSR/static/actions/security and shutdown",async()=>{
  const snapshot=await uiOutputInventory(packageRoot!);
  for(const label of ["first","second"]){
    const fixtureData=await fixture(label);const running=await launch(fixtureData.root,await freePort());const origin=await running.ready;
    console.log(running.output().trim());
    expect(running.output()).toContain("artifacts verified in");expect(running.output()).toMatch(/\(v\d+\.\d+\.\d+\)/);
    const htmlByRoute=new Map<string,string>();
    for(const path of ["/","/tasks","/specs","/timeline",`/tasks/${fixtureData.task.id}`,`/specs/${fixtureData.spec.id}`]){const response=await fetch(origin+path);expect(response.status).toBe(200);const html=await response.text();expect(html).toContain(fixtureData.root.split("/").at(-1)!);htmlByRoute.set(path,html);}
    expect(htmlByRoute.get("/specs")).toContain(`${label} package fixture`);
    expect(htmlByRoute.get(`/tasks/${fixtureData.task.id}`)).toContain(`${label} task`);
    const html=htmlByRoute.get(`/specs/${fixtureData.spec.id}`)!;expect(html).toContain('name="specRevision"');expect(html).toContain('<svg');
    const assets=[...new Set([...html.matchAll(/(?:href|src)="([^" ]+\.(?:css|js|woff2?))"/g)].map(match=>match[1]!))];expect(assets.length).toBeGreaterThan(0);
    for(const path of assets){const response=await fetch(new URL(path,origin));expect(response.status).toBe(200);expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);}
    for(const path of ["/package.json","/src/index.ts","/build/handler.js","/server/handler.js","/.specpm/config.toml","/@fs/etc/passwd","/@vite/client"]){expect((await fetch(origin+path)).status).toBe(404);}
    expect((await fetch(origin+"/tasks",{headers:{Host:"evil.example:"+new URL(origin).port}})).status).toBe(421);
    const before=await readFile(fixtureData.spec.filePath,"utf8");const revision=sha256(before);
    for(const foreign of ["http://evil.example",null]){const response=await post(origin,fixtureData.spec.id,form(revision),foreign);expect(response.status).toBe(403);expect(await readFile(fixtureData.spec.filePath,"utf8")).toBe(before);}
    const invalid=await post(origin,fixtureData.spec.id,form("bad"));expect(invalid.status).toBe(400);expect(await invalid.text()).toContain("exact packed answer");expect(await readFile(fixtureData.spec.filePath,"utf8")).toBe(before);
    const bigRecovery="retained-"+"x".repeat(600*1024);const conflict=await post(origin,fixtureData.spec.id,form("0".repeat(64),"exact conflict",bigRecovery));expect(conflict.status).toBe(409);const conflictHTML=await conflict.text();expect(conflictHTML).toContain(bigRecovery);expect(conflictHTML).toContain("exact conflict");expect(await readFile(fixtureData.spec.filePath,"utf8")).toBe(before);
    const success=await post(origin,fixtureData.spec.id,form(revision));expect(success.status).toBe(200);expect(await success.text()).toContain("question resolved");expect(await readFile(fixtureData.spec.filePath,"utf8")).toContain("exact packed answer");
    const next=await readFile(fixtureData.spec.filePath,"utf8");const enhanced=form(sha256(next),"enhanced answer");enhanced.set("question","Second?");const response=await post(origin,fixtureData.spec.id,enhanced,origin,true);expect(response.status).toBe(200);expect((await response.json() as {type:string}).type).toBe("success");expect(await readFile(fixtureData.spec.filePath,"utf8")).toContain("enhanced answer");
    running.child.kill("SIGTERM");running.child.kill("SIGTERM");expect((await running.closed).code).toBe(0);await expect(fetch(origin)).rejects.toThrow();
  }
  expect(await uiOutputInventory(packageRoot!)).toEqual(snapshot);
 },30000);
});
