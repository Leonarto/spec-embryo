import { afterEach, describe, expect, test } from "bun:test";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, connect } from "node:net";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveNodeRuntime } from "../src/services/ui.ts";
const children: ChildProcess[] = [];
const roots: string[] = [];
afterEach(async () => { for (const child of children.splice(0)) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function port() { const server = createServer(); await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve)); const value = (server.address() as { port: number }).port; await new Promise<void>(resolve => server.close(() => resolve())); return value; }
async function launch(options: { port?: number; host?: string; handler?: string } = {}) {
  const root = await mkdtemp(join(tmpdir(), "spm node wrapper ")); roots.push(root);
  await mkdir(join(root, "web/build"), { recursive: true }); await mkdir(join(root, "web/runtime"));
  await cp(new URL("../web/runtime/server.mjs", import.meta.url), join(root, "web/runtime/server.mjs"));
  await writeFile(join(root, "web/build/handler.js"), options.handler ?? `export function handler(req,res) { if(req.url==='/drain') setTimeout(()=>res.end('confirmed'),150); else res.end(process.env.SPM_PROJECT_ROOT); }`);
  const selectedPort = options.port ?? await port();
  const node = await resolveNodeRuntime();
  const child = spawn(node.executable, [join(root, "web/runtime/server.mjs")], { cwd: root, stdio: ["ignore", "pipe", "pipe", "ipc"], env: { ...process.env, SPM_PROJECT_ROOT: root, SPM_UI_CONFIG: JSON.stringify({ host: options.host ?? "127.0.0.1", port: selectedPort, buildId: "test-id", version: "0.3.1" }) } });
  children.push(child);
  const closed = new Promise<{ code: number | null; signal: string | null }>(resolve => child.once("close", (code, signal) => resolve({ code, signal })));
  const ready = new Promise<Record<string, any>>((resolve, reject) => { child.on("message", (message: any) => { if (message.type === "spm-ui-ready") resolve(message); else if (message.type === "spm-ui-error") reject(new Error(message.message)); }); child.once("close", code => reject(new Error(`closed before ready: ${code}`))); });
  return { child, ready, closed, root, selectedPort };
}
async function rawRequest(port: number, headers: string) {
  return new Promise<string>((resolve, reject) => { let result = ""; const socket = connect(port, "127.0.0.1", () => socket.write(`GET / HTTP/1.1\r\n${headers}\r\nConnection: close\r\n\r\n`)); socket.on("data", chunk => result += chunk); socket.on("end", () => resolve(result)); socket.on("error", reject); });
}
describe("owned Node UI listener", () => {
  test("binds the real bounded fallback, announces exact readiness and rejects duplicate/foreign Hosts", async () => {
    const busy = createServer(); await new Promise<void>(resolve => busy.listen(0,"127.0.0.1",resolve)); const first = (busy.address() as {port:number}).port;
    try {
      const running = await launch({ port: first }); const message = await running.ready;
      expect(message.port).toBeGreaterThan(first); expect(message.port).toBeLessThanOrEqual(Math.min(first + 25, 65535));
      expect(message.buildId).toBe("test-id"); expect(await (await fetch(message.origin)).text()).toBe(running.root);
      expect(await rawRequest(message.port, `Host: evil.example:${message.port}`)).toContain("421");
      expect(await rawRequest(message.port, `Host: 127.0.0.1:${message.port}\r\nHost: 127.0.0.1:${message.port}`)).toContain("400");
      running.child.kill("SIGTERM"); running.child.kill("SIGTERM"); expect((await running.closed).code).toBe(0);
      await expect(fetch(message.origin)).rejects.toThrow();
    } finally { busy.close(); }
  }, 10000);
  test("IPC disconnect drains an in-flight response and closes its listener", async () => {
    const running = await launch(); const message = await running.ready;
    const response = fetch(`${message.origin}/drain`, { headers: { connection: "close" } }); await new Promise(resolve => setTimeout(resolve, 50)); running.child.disconnect();
    expect(await (await response).text()).toBe("confirmed"); expect((await running.closed).code).toBe(0); await expect(fetch(message.origin)).rejects.toThrow();
  }, 10000);
  test("startup cancellation never announces ready and closes the bound listener", async () => {
    const running = await launch({ handler: `await new Promise(resolve=>setTimeout(resolve,250));export function handler(req,res){res.end('late')}` });
    const ready = running.ready.catch(() => undefined);
    // Poll the actual starting socket rather than assume child scheduling.
    for (let attempt = 0; attempt < 100; attempt++) { try { const response = await fetch(`http://127.0.0.1:${running.selectedPort}`); if(response.status===503) break; } catch {} await new Promise(resolve => setTimeout(resolve, 5)); }
    running.child.kill("SIGINT"); expect((await running.closed).code).toBe(0); expect(await ready).toBeUndefined(); await expect(fetch(`http://127.0.0.1:${running.selectedPort}`)).rejects.toThrow();
  }, 10000);
  test("the 30 second drain deadline closes a stalled response and its child", async () => {
    const running=await launch({handler:`export function handler(req,res){res.writeHead(200);res.write('pending');setInterval(()=>{},1000);}`});
    const message=await running.ready;const response=await fetch(message.origin);expect(response.status).toBe(200);
    const body=response.text().catch(()=>"aborted");const started=performance.now();running.child.kill("SIGTERM");
    expect((await running.closed).code).toBe(0);expect(performance.now()-started).toBeGreaterThanOrEqual(29_000);expect(performance.now()-started).toBeLessThan(34_000);expect(await body).toBe("aborted");await expect(fetch(message.origin)).rejects.toThrow();
  },35000);
  test("serves the exact bracketed IPv6 origin when loopback IPv6 is available", async () => {
    const probe = createServer();
    try { await new Promise<void>((resolve,reject) => { probe.once("error",reject); probe.listen(0,"::1",resolve); }); }
    catch (error) { if (["EAFNOSUPPORT","EADDRNOTAVAIL"].includes((error as NodeJS.ErrnoException).code ?? "")) return; throw error; }
    const selected = (probe.address() as {port:number}).port; await new Promise<void>(resolve=>probe.close(()=>resolve()));
    const running = await launch({host:"::1",port:selected});const message=await running.ready;
    expect(message.origin).toBe(`http://[::1]:${message.port}`);expect((await fetch(message.origin)).status).toBe(200);
    running.child.kill("SIGTERM");expect((await running.closed).code).toBe(0);
  },10000);
  test("handler initialization failure reports nonzero and relinquishes the port", async () => {
    const running = await launch({ handler: `throw new Error('fixture initialization failure')` }); await expect(running.ready).rejects.toThrow("fixture initialization failure"); expect((await running.closed).code).toBe(1); await expect(fetch(`http://127.0.0.1:${running.selectedPort}`)).rejects.toThrow();
  }, 10000);
});
