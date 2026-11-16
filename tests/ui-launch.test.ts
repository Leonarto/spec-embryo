import { expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { uiBuildId, uiOutputInventory, uiSourceIdentity } from "../src/services/ui-artifacts.ts";

test("missing and stale package artifacts fail before a Node probe, child or listener", async () => {
  const root=await mkdtemp(join(tmpdir(),"spm launch guards "));
  try {
    for(const path of ["src/commands","src/services","web/src","web/runtime","web/build","scripts"])await mkdir(join(root,path),{recursive:true});
    const paths=["src/commands/ui.ts","src/services/ui.ts","src/services/ui-artifacts.ts","src/cli.ts","src/storage.ts","web/runtime/server.mjs","package.json","web/package.json","bun.lock","web/svelte.config.js","web/svelte-plugin-options.js","web/vite.config.ts","web/vite-paths.ts","web/tsconfig.json","tsconfig.json","scripts/build-ui.ts"];
    for(const path of paths)await cp(new URL(`../${path}`,import.meta.url),join(root,path));
    await writeFile(join(root,"web/build/handler.js"),"throw new Error('must never initialize')");
    await writeFile(join(root,"node"),`#!/bin/sh\necho probed > '${join(root,"node-probe")}'\nexit 1\n`,{mode:0o755});
    await writeFile(join(root,"entry.ts"),`import {runUiCommand} from './src/commands/ui.ts';import{parseArgs}from'./src/cli.ts';try{await runUiCommand(process.cwd(),parseArgs(['ui','--port','65535']));}catch(error){console.error(error.message);process.exitCode=1;}`);
    for(const stale of [false,true]) {
      if(stale){const identity={schema:1 as const,...await uiSourceIdentity(root),node:"v25.6.0",outputs:await uiOutputInventory(root)};await writeFile(join(root,"web/build/spm-manifest.json"),JSON.stringify({...identity,buildId:uiBuildId(identity)}));await writeFile(join(root,"src/stale.ts"),"same version mutation");}
      const child=spawn(process.execPath,[join(root,"entry.ts")],{cwd:root,env:{...process.env,PATH:root},stdio:["ignore","pipe","pipe"]});let output="";child.stdout!.on("data",bytes=>output+=bytes);child.stderr!.on("data",bytes=>output+=bytes);
      const code=await new Promise<number|null>(resolve=>child.once("close",resolve));expect(code).toBe(1);expect(output).toContain("Precompiled UI artifacts are missing, stale or invalid");expect(output).not.toContain("ready at");await expect(readFile(join(root,"node-probe"))).rejects.toThrow();
    }
  } finally {await rm(root,{recursive:true,force:true});}
},10000);
