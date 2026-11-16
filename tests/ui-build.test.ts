import { expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("an explicit failed build removes the old success manifest before probing Node", async () => {
  const root = await mkdtemp(join(tmpdir(), "spm failed build "));
  try {
    for (const path of ["src", "web/src", "web/runtime", "scripts"]) await cp(new URL(`../${path}`, import.meta.url), join(root, path), { recursive: true });
    for (const path of ["package.json", "web/package.json", "bun.lock", "web/svelte.config.js", "web/svelte-plugin-options.js", "web/vite.config.ts", "web/vite-paths.ts", "web/tsconfig.json", "tsconfig.json", "scripts/build-ui.ts"]) await cp(new URL(`../${path}`, import.meta.url), join(root, path));
    await mkdir(join(root, "web/build"), { recursive: true }); await writeFile(join(root, "web/build/spm-manifest.json"), '{"previous":"success"}');
    const child = spawn(process.execPath, ["run", join(root,"scripts/build-ui.ts")], { cwd: root, env: { ...process.env, PATH: root }, stdio: ["ignore","pipe","pipe"] });
    let output="";child.stdout!.on("data",bytes=>output+=bytes);child.stderr!.on("data",bytes=>output+=bytes);
    const code=await new Promise<number|null>(resolve=>child.once("close",resolve));expect(code).not.toBe(0);expect(output).toContain("actual Node.js >=22.12.0");
    await expect(readFile(join(root,"web/build/spm-manifest.json"))).rejects.toThrow();
  } finally { await rm(root,{recursive:true,force:true}); }
},10000);


test("a build rejects web/build ancestor aliases without modifying the outside success sentinel", async () => {
  for (const alias of ["web", "web/build"]) {
    const root = await mkdtemp(join(tmpdir(), "spm aliased build "));
    try {
      for (const path of ["src", "web/src", "web/runtime", "scripts"]) await cp(new URL(`../${path}`, import.meta.url), join(root, path), { recursive: true });
      for (const path of ["package.json", "web/package.json", "bun.lock", "web/svelte.config.js", "web/svelte-plugin-options.js", "web/vite.config.ts", "web/vite-paths.ts", "web/tsconfig.json", "tsconfig.json", "scripts/build-ui.ts"]) await cp(new URL(`../${path}`, import.meta.url), join(root, path));
      await mkdir(join(root, "web/build"), { recursive: true });
      const sentinel = '{"outside":"must remain untouched"}';
      await writeFile(join(root, "web/build/spm-manifest.json"), sentinel);
      const outside = join(root, "outside-owned-tree"); await rename(join(root, alias), outside); await symlink(outside, join(root, alias));
      const marker = join(outside, alias === "web" ? "build/spm-manifest.json" : "spm-manifest.json");
      const child = spawn(process.execPath, ["run", join(root,"scripts/build-ui.ts")], { cwd: root, env: { ...process.env, PATH: root }, stdio: ["ignore","pipe","pipe"] });
      let output="";child.stderr!.on("data",bytes=>output+=bytes);const code=await new Promise<number|null>(resolve=>child.once("close",resolve));
      expect(code).not.toBe(0);expect(output).toContain("parent must be an owned directory");expect(await readFile(marker,"utf8")).toBe(sentinel);
    } finally { await rm(root,{recursive:true,force:true}); }
  }
},10000);
