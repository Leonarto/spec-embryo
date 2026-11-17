import { describe, expect, test } from "bun:test";
import { createDocumentReader, type CallbackDocumentReader } from "../src/document-reader.ts";

describe("per-load document read admission", () => {
  test("shares a FIFO64 cap across collections and preserves Promise.all source positions", async () => {
    const started: string[] = [];
    const pending = new Map<string, Parameters<CallbackDocumentReader>[1]>();
    const buffers = new Map<string, Buffer>();
    let peak = 0;
    const read = createDocumentReader((path, complete) => {
      started.push(path); pending.set(path, complete); peak = Math.max(peak, pending.size);
    });
    const paths = ["current", "specs", "tasks", "handoffs", "session", "org"].flatMap(scope => Array.from({ length: 40 }, (_, n) => `${scope}/${n}`));
    const result = Promise.all(paths.map(path => read(path)));
    expect(started).toEqual(paths.slice(0, 64));
    while (pending.size) {
      const [path, complete] = [...pending.entries()].at(-1)!;
      pending.delete(path); const bytes = Buffer.from(path); buffers.set(path, bytes); complete(null, bytes);
    }
    const values = await result;
    expect(peak).toBe(64); expect(started).toEqual(paths); expect(values.map(bytes => bytes.toString())).toEqual(paths);
    expect(values.every((bytes, n) => bytes === buffers.get(paths[n]!))).toBe(true);
    const later = read("later"); expect(started.at(-1)).toBe("later"); pending.get("later")!(null, Buffer.from("fresh"));
    expect((await later).toString()).toBe("fresh");
  });

  test("independent loads each admit64 instead of sharing a process-global semaphore", async () => {
    const pending = new Map<string, Parameters<CallbackDocumentReader>[1]>();
    const callback: CallbackDocumentReader = (path, complete) => { pending.set(path, complete); };
    const left = createDocumentReader(callback), right = createDocumentReader(callback);
    const result = Promise.all(Array.from({ length: 90 }, (_, n) => left(`L/${n}`)).concat(Array.from({ length: 90 }, (_, n) => right(`R/${n}`))));
    expect([...pending.keys()].filter(path => path.startsWith("L/"))).toHaveLength(64);
    expect([...pending.keys()].filter(path => path.startsWith("R/"))).toHaveLength(64);
    expect(pending.size).toBe(128);
    while (pending.size) { const [path, complete] = pending.entries().next().value!; pending.delete(path); complete(null, Buffer.from(path)); }
    expect(await result).toHaveLength(180);
  });

  test("read errors and synchronous setup throws release slots, preserve errors and drain without unhandled rejections", async () => {
    const callbackError = Object.assign(new Error("read failed"), { code: "ENOENT" });
    const setupError = new Error("setup failed");
    const pending = new Map<string, Parameters<CallbackDocumentReader>[1]>(), started: string[] = [], unhandled: unknown[] = [];
    const onUnhandled = (error: unknown) => { unhandled.push(error); };
    process.on("unhandledRejection", onUnhandled);
    try {
      const read = createDocumentReader((path, complete) => { started.push(path); if (path === "throw") throw setupError; pending.set(path, complete); });
      const held = Array.from({ length: 64 }, (_, n) => read(`held/${n}`));
      const thrown = read("throw"), failed = read("error"), tail = read("tail");
      const result = Promise.allSettled([...held, thrown, failed, tail]);
      const first = pending.get("held/0")!; pending.delete("held/0"); first(null, Buffer.from("first"));
      first(null, Buffer.from("duplicate callback ignored"));
      expect(started.slice(64)).toEqual(["throw", "error"]);
      const error = pending.get("error")!; pending.delete("error"); error(callbackError);
      expect(started.at(-1)).toBe("tail"); expect(pending.size).toBe(64);
      while (pending.size) { const [path, complete] = pending.entries().next().value!; pending.delete(path); complete(null, Buffer.from(path)); }
      const settled = await result;
      expect(settled[64]).toEqual({ status: "rejected", reason: setupError });
      expect(settled[65]).toEqual({ status: "rejected", reason: callbackError }); expect(settled[66]?.status).toBe("fulfilled");
      await new Promise(resolve => setTimeout(resolve, 0)); expect(unhandled).toEqual([]);
    } finally { process.off("unhandledRejection", onUnhandled); }
  });

  test("synchronous completions of a long queued tail drain iteratively", async () => {
    let synchronous = false, depth = 0, maxDepth = 0;
    const held: Array<Parameters<CallbackDocumentReader>[1]> = [];
    const read = createDocumentReader((path, complete) => {
      depth++; maxDepth = Math.max(maxDepth, depth);
      if (synchronous) complete(null, Buffer.from(path)); else held.push(complete);
      depth--;
    });
    const values = Promise.all(Array.from({ length: 10000 }, (_, n) => read(String(n))));
    expect(held).toHaveLength(64); synchronous = true;
    held[0]!(null, Buffer.from("0")); for (let n = 1; n < held.length; n++) held[n]!(null, Buffer.from(String(n)));
    expect(await values).toHaveLength(10000); expect(maxDepth).toBe(1);
    expect((await read("after drain")).toString()).toBe("after drain");
  });
});
