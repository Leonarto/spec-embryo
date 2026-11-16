import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rename, rm, stat, unlink, utimes, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { createDocumentParseMemo } from "../src/document-parse-memo.ts";
import { createDocumentReader, type CallbackDocumentReader } from "../src/document-reader.ts";
import { documentSourceHash, registerDocumentSource } from "../src/services/document-provenance.ts";
import { initializeProject, loadProjectContext } from "../src/repository.ts";
import { createWorkspaceSource } from "../src/services/workspace.ts";
import { buildWorkspaceDetailEnvelope } from "../src/services/workspace-detail.ts";
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const bytes = Buffer.from("+++\nvalue = 1\n+++\nbody");

describe("private exact-byte canonical parse memo", () => {
  test("validates internal limits immediately", () => {
    for (const value of [0,-1,0.5,Infinity,NaN,16385]) expect(() => createDocumentParseMemo({ maxEntries:value })).toThrow(RangeError);
    for (const value of [0,-1,0.5,Infinity,NaN,33554433]) expect(() => createDocumentParseMemo({ maxBytes:value })).toThrow(RangeError);
    expect(() => createDocumentParseMemo(null as never)).toThrow(RangeError);
    expect(() => createDocumentParseMemo([] as never)).toThrow(RangeError);
  });
  test("new equal bytes hit while independent publications and retained proof bytes cannot be poisoned", () => {
    const memo=createDocumentParseMemo();let calls=0;
    const parser=(filePath:string,_attrs:unknown,body:string)=>{calls++;return {filePath,body,own:undefined,tags:["", "é🧪"],empty:[],priority:-1.5,nil:null,flag:false};};
    const input=Buffer.from(bytes),first=memo.parse("/a",input,parser);input.fill(0);first.body="mutated";first.tags.push("bad");first.empty.push("bad" as never);
    const second=memo.parse("/a",Buffer.from(bytes),parser),third=memo.parse("/a",Buffer.from(bytes),parser);
    expect(calls).toBe(1);expect(second.body).toBe("body");expect(second.tags).toEqual(["", "é🧪"]);expect(second.empty).toEqual([]);expect(second).not.toBe(third);expect(second.tags).not.toBe(third.tags);expect(Object.hasOwn(second,"own")).toBe(true);expect(Object.keys(second)).toEqual(["filePath","body","own","tags","empty","priority","nil","flag"]);
    const changed=Buffer.from(bytes.toString().replace("value = 1","value = 2"));memo.parse("/a",changed,parser);expect(calls).toBe(2);memo.parse("/a",Buffer.from(bytes),parser);expect(calls).toBe(3);
  });
  test("parser identity, exact original alias and roots partition canonical values", () => {
    const memo=createDocumentParseMemo();let calls=0;
    const parser=(filePath:string)=>{calls++;return {filePath,scope:"session",tags:[]};},other=(filePath:string)=>({filePath,scope:"org",tags:[]});
    const absolute=resolve("alias.md"),alias=relative(process.cwd(),absolute);
    expect(memo.parse(absolute,bytes,parser).filePath).toBe(absolute);expect(memo.parse(alias,bytes,parser).filePath).toBe(alias);expect(calls).toBe(2);
    expect(memo.parse(alias,bytes,other).scope).toBe("org");expect(memo.parse("/another-root/alias.md",bytes,parser).filePath).toBe("/another-root/alias.md");expect(calls).toBe(3);
  });
  test("changed invalid bytes remove old success and every failure parses again", () => {
    const memo=createDocumentParseMemo();let calls=0;
    const parser=(_path:string,_attrs:unknown,body:string)=>{calls++;if(body==="invalid")throw Error("invalid");return {body};};
    memo.parse("/a",Buffer.from("ok"),parser);
    for(let i=0;i<2;i++)expect(()=>memo.parse("/a",Buffer.from("invalid"),parser)).toThrow("invalid");
    expect(calls).toBe(3);memo.parse("/a",Buffer.from("ok"),parser);expect(calls).toBe(4);
    for(let i=0;i<2;i++)expect(()=>memo.parse("/a",Buffer.from("+++\nx = [\n+++\n"),parser)).toThrow();
    memo.parse("/a",Buffer.from("ok"),parser);expect(calls).toBe(5);
  });
  test("unsupported shape/descriptor values bypass with ordinary parser semantics", () => {
    const values:unknown[]=[{nested:{a:1}},{nested:[["a"]]},{mixed:["a",1]},{sparse:new Array(1)},new Date(0),Object.create(null),Object.freeze({a:"frozen"}),{[Symbol("key")]:"symbol"},{n:NaN},{n:Infinity},{n:1n},{fn:()=>1}];
    values.push(Object.defineProperty({},"a",{value:"hidden"}),Object.defineProperty({},"a",{get:()=>"accessor",enumerable:true}),{items:Object.assign(["a"],{extra:"x"})},{items:Object.assign(["a"],{[Symbol("a")]:"x"})},{items:Object.defineProperty(["a"],"0",{get:()=>"x",enumerable:true})},{items:Object.freeze(["a"])},{items:Object.freeze([])});
    for(const value of values){const memo=createDocumentParseMemo();let calls=0;const parser=()=>{calls++;return value;};expect(memo.parse("/a",bytes,parser)).toBe(value);expect(memo.parse("/a",bytes,parser)).toBe(value);expect(calls).toBe(2);}
  });
  test("LRU count pressure evicts B after A is touched, and eviction forces a parse", () => {
    const memo=createDocumentParseMemo({maxEntries:2}),calls=new Map<string,number>();const parser=(path:string)=>{calls.set(path,(calls.get(path)??0)+1);return {path};};
    for(const id of ["A","B","A","C","A","B"])memo.parse(id,bytes,parser);
    expect(Object.fromEntries(calls)).toEqual({A:1,B:2,C:1});
  });
  test("accounted-byte pressure, replacement accounting and oversize obey test bounds", () => {
    const body=Buffer.from("abc"),value={body:"abc"},size=body.length+Buffer.byteLength(JSON.stringify(value));
    const memo=createDocumentParseMemo({maxBytes:size*2,maxEntries:9}),calls=new Map<string,number>();const parser=(path:string,_a:unknown,text:string)=>{calls.set(path,(calls.get(path)??0)+1);return {body:text};};
    for(const id of ["A","B","A","C","A","B"])memo.parse(id,body,parser);expect(calls.get("A")).toBe(1);expect(calls.get("B")).toBe(2);
    const replace=createDocumentParseMemo({maxBytes:size*2});let n=0;const p=(_p:string,_a:unknown,text:string)=>{n++;return {body:text};};
    replace.parse("A",body,p);replace.parse("B",body,p);for(const b of ["def","ghi","jkl"])replace.parse("A",Buffer.from(b),p);replace.parse("B",body,p);expect(n).toBe(5);
    // Bypassing an impossible single entry must not evict the useful retained value.
    replace.parse("large",Buffer.from("x".repeat(size*2)),p);replace.parse("large",Buffer.from("x".repeat(size*2)),p);replace.parse("B",body,p);expect(n).toBe(7);
  });
  test("each load really reads even on a parser hit, and IO failure/recovery cannot publish an entry", async () => {
    const root=await mkdtemp("/private/tmp/spm-memo-counted-read-"),path=join(root,"doc.md"),memo=createDocumentParseMemo();let reads=0,parses=0;
    const reader=createDocumentReader((file,complete)=>{reads++;void readFile(file).then(raw=>complete(null,raw),error=>complete(error));});
    const parser=(_p:string,_a:unknown,body:string)=>{parses++;return {body,tags:[] as string[]};};
    const load=async()=>{const raw=await reader(path);return registerDocumentSource(memo.parse(path,raw,parser),raw);};
    try{await writeFile(path,bytes);const first=await load(),second=await load();expect(reads).toBe(2);expect(parses).toBe(1);expect(first).not.toBe(second);await unlink(path);await expect(load()).rejects.toThrow();expect(reads).toBe(3);expect(parses).toBe(1);await writeFile(path,bytes);const recovered=await load();expect(reads).toBe(4);expect(parses).toBe(1);expect(recovered).not.toBe(second);expect(documentSourceHash(recovered)).toBe(hash(bytes));}finally{await rm(root,{recursive:true,force:true});}
  });
  test("reverse-completing independent reads publish their own bytes and hashes; failure cannot poison another read", async () => {
    const memo=createDocumentParseMemo(),pending:Array<Parameters<CallbackDocumentReader>[1]>=[];
    const read=createDocumentReader((_path,complete)=>pending.push(complete));let calls=0;
    const parser=(_p:string,_a:unknown,body:string)=>{calls++;return {body,tags:[] as string[]};};
    const load=async()=>{const raw=await read("/same");return registerDocumentSource(memo.parse("/same",raw,parser),raw);};
    const a=load(),b=load();expect(pending).toHaveLength(2);pending[1]!(null,Buffer.from("new"));const rb=await b;pending[0]!(null,Buffer.from("old"));const ra=await a;
    expect(rb.body).toBe("new");expect(ra.body).toBe("old");expect(documentSourceHash(rb)).toBe(hash(Buffer.from("new")));expect(documentSourceHash(ra)).toBe(hash(Buffer.from("old")));expect(ra.tags).not.toBe(rb.tags);rb.tags.push("mutated");expect(ra.tags).toEqual([]);
    const failed=load(),success=load(),settled=Promise.allSettled([failed,success]);pending[2]!(Error("read failed"));pending[3]!(null,Buffer.from("current"));const results=await settled;expect(results[0]!.status).toBe("rejected");expect(results[1]!.status).toBe("fulfilled");expect(calls).toBe(3);
    const again=load();pending[4]!(null,Buffer.from("current"));expect((await again).body).toBe("current");expect(calls).toBe(3);
  });
});

describe("common repository read seam", () => {
  test("real IO failure after a warm hit rejects, recovery observes bytes, and missing-current has no invented provenance", async () => {
    const root=await mkdtemp("/private/tmp/spm-memo-read-error-");
    try{await initializeProject(root);const a=await loadProjectContext(root);await loadProjectContext(root);const path=a.currentState.filePath;await rename(path,path+".saved");await mkdir(path);await expect(loadProjectContext(root)).rejects.toThrow();await rm(path,{recursive:true});await rename(path+".saved",path);const b=await loadProjectContext(root);expect(b).toEqual(a);expect(documentSourceHash(b.currentState)).toBe(hash(await readFile(path)));expect(b.currentState).not.toBe(a.currentState);await unlink(path);const missing=await loadProjectContext(root);expect(missing.currentState.summary).toBe("No current state file exists yet.");expect(documentSourceHash(missing.currentState)).toBeNull();}
    finally{await rm(root,{recursive:true,force:true});}
  });
  test("fresh edits, aliases, enumeration and scoped policy preserve context/provenance/revision/DTO behavior", async () => {
    const root=await mkdtemp("/private/tmp/spm-memo-fresh-");
    try{
      await initializeProject(root);const first=await loadProjectContext(root),path=first.tasks[0]!.filePath,raw=await readFile(path),stamp=await stat(path),firstSource=createWorkspaceSource(first,0);const originalDetail=structuredClone(buildWorkspaceDetailEnvelope(firstSource,{kind:"task",id:first.tasks[0]!.id}));
      first.tasks[0]!.tags.push("caller mutation");first.tasks[0]!.body="poison";const clean=await loadProjectContext(root);expect(clean.tasks[0]!.tags).not.toContain("caller mutation");expect(buildWorkspaceDetailEnvelope(createWorkspaceSource(clean,0),{kind:"task",id:clean.tasks[0]!.id})).toEqual(originalDetail);
      const edited=Buffer.from(raw.toString().replace("# Scope","# SCOPE"));expect(edited.length).toBe(raw.length);expect(edited.equals(raw)).toBe(false);await writeFile(path,edited);await utimes(path,stamp.atime,stamp.mtime);const changed=await loadProjectContext(root);expect(changed.tasks[0]!.body).toContain("# SCOPE");expect(documentSourceHash(changed.tasks[0]!)).toBe(hash(edited));expect(createWorkspaceSource(changed,0).revision).not.toBe(firstSource.revision);
      await writeFile(path+".new",raw);await rename(path+".new",path);const replaced=await loadProjectContext(root);expect(documentSourceHash(replaced.tasks[0]!)).toBe(hash(raw));
      const added=join(root,"docs/spm/tasks/TASK-999-new.md");await writeFile(added,raw.toString().replaceAll("TASK-001","TASK-999"));expect((await loadProjectContext(root)).tasks.some(t=>t.id==="TASK-999")).toBe(true);await unlink(added);expect((await loadProjectContext(root)).tasks.some(t=>t.id==="TASK-999")).toBe(false);
      const alias=relative(process.cwd(),root),aliased=await loadProjectContext(alias);expect(aliased.tasks[0]!.filePath).toBe(relative(process.cwd(),path));expect(documentSourceHash(aliased.tasks[0]!)).toBe(hash(raw));expect((await loadProjectContext(root)).tasks[0]!.filePath).toBe(path);
      for(const scope of ["session","org"]){const dir=join(root,".specpm/memory",scope);await mkdir(dir,{recursive:true});await writeFile(join(dir,"note.md"),`+++\ndoc_kind = "memory-note"\nid = "NOTE-${scope}-001"\ntitle = "${scope}"\ntags = []\n+++\nbody`);}
      const notes=await loadProjectContext(root);expect(notes.sessionNotes).toHaveLength(1);expect(notes.orgNotes).toHaveLength(1);expect(notes.orgNotes[0]!.writePolicy).toBe("read-only");const config=structuredClone(notes.config);config.memoryScopes.org.writePolicy="read-write";const policy=await loadProjectContext(root,{config});expect(policy.orgNotes[0]!.writePolicy).toBe("read-write");const configPath=join(root,".specpm/config.toml"),configRaw=await readFile(configPath,"utf8");await writeFile(configPath,configRaw.replace('write_policy = "read-only"','write_policy = "read-write"'));expect((await loadProjectContext(root)).orgNotes[0]!.writePolicy).toBe("read-write");expect((await loadProjectContext(root,{includeScopedMemory:false})).sessionNotes).toEqual([]);
    }finally{await rm(root,{recursive:true,force:true});}
  });
});
