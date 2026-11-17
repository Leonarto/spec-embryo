import { describe, expect, spyOn, test } from "bun:test";
import { readFile as callbackReadFile } from "node:fs";
import { mkdtemp, mkdir, readFile, rename, rm, stat, symlink, utimes, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import * as readers from "../src/document-reader.ts";
import { initializeProject, loadProjectContext, readProjectConfig } from "../src/repository.ts";
import { resolveProjectPaths } from "../src/paths.ts";
import { serializeTomlFrontmatter } from "../src/frontmatter.ts";
import { documentSourceHash } from "../src/services/document-provenance.ts";

const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const taskText = (title: string, id = "TASK-1") => serializeTomlFrontmatter({ doc_kind: "task", id, title, status: "todo", priority: 2, spec_ids: [], depends_on: [], blocked_by: [], tags: [] }, "Fresh body");
async function fixture() {
  const root = await mkdtemp("/private/tmp/spm-project-read-"); await initializeProject(root); return root;
}

describe("fresh project Buffer loading", () => {
  test("one pool covers current/specs/tasks/handoffs and enabled notes with exact same-read hashes and legacy ordering", async () => {
    const root = await fixture();
    try {
      const config = await readProjectConfig(root), paths = resolveProjectPaths(root, config);
      config.memoryScopes.session.enabled = true; config.memoryScopes.org.enabled = true;
      config.memoryScopes.session.writePolicy = "read-write"; config.memoryScopes.org.writePolicy = "read-only";
      for (const dir of [paths.specsDir, paths.tasksDir, paths.handoffsDir, paths.sessionMemoryDir, paths.orgMemoryDir]) { await rm(dir, { recursive: true, force: true }); await mkdir(dir, { recursive: true }); }
      const written: Array<[string, string]> = [];
      for (let n = 0; n < 100; n++) {
        const file = String(n).padStart(3, "0"), reverse = String(99 - n).padStart(3, "0");
        written.push([join(paths.tasksDir, `${file}.md`), taskText(`Task ${reverse}`, `TASK-${reverse}`)]);
        written.push([join(paths.specsDir, `${file}.md`), serializeTomlFrontmatter({ doc_kind: "spec", id: `SPEC-${reverse}`, title: reverse, status: "active", task_ids: [], tags: [] }, "Spec body")]);
        written.push([join(paths.handoffsDir, `${file}.md`), serializeTomlFrontmatter({ doc_kind: "handoff", id: `HANDOFF-${file}`, title: file, created_at: n % 2 ? "2026-11-14T00:00:00Z" : "2026-11-15T00:00:00Z", active_task_ids: [], related_spec_ids: [], tags: [] }, "Handoff body")]);
        for (const [scope, dir] of [["session", paths.sessionMemoryDir], ["org", paths.orgMemoryDir]] as const) written.push([join(dir, `${file}.md`), serializeTomlFrontmatter({ doc_kind: "memory-note", id: `NOTE-${scope}-${reverse}`, title: reverse, tags: [] }, "Scoped body")]);
      }
      await Promise.all(written.map(([path, text]) => writeFile(path, text)));
      let active = 0, peak = 0; const reads: string[] = []; const original = readers.createDocumentReader;
      const factory = spyOn(readers, "createDocumentReader").mockImplementation(() => original((path, complete) => {
        reads.push(path); active++; peak = Math.max(peak, active);
        callbackReadFile(path, (error, bytes) => { active--; complete(error, bytes); });
      }));
      let context;
      try { context = await loadProjectContext(root, { config }); expect(factory).toHaveBeenCalledTimes(1); }
      finally { factory.mockRestore(); }
      expect(peak).toBe(64); expect(active).toBe(0); expect(reads).toHaveLength(501);
      expect(new Set(reads)).toEqual(new Set([paths.stateFile, ...written.map(([path]) => path)]));
      expect(context.tasks.map(task => task.id)).toEqual(Array.from({ length: 100 }, (_, n) => `TASK-${String(99 - n).padStart(3, "0")}`));
      expect(context.specs[0]?.id).toBe("SPEC-099"); expect(context.sessionNotes.map(note => note.id)).toEqual(context.sessionNotes.map(note => note.id).sort());
      expect(context.orgNotes.every(note => note.scope === "org" && note.writePolicy === "read-only")).toBe(true);
      expect(context.sessionNotes.every(note => note.scope === "session" && note.writePolicy === "read-write")).toBe(true);
      expect(context.handoffs.map(note => note.id)).toEqual([...Array.from({ length: 50 }, (_, n) => `HANDOFF-${String(n * 2).padStart(3, "0")}`), ...Array.from({ length: 50 }, (_, n) => `HANDOFF-${String(n * 2 + 1).padStart(3, "0")}`)]);
      for (const document of [context.currentState, ...context.tasks, ...context.specs, ...context.handoffs, ...context.sessionNotes, ...context.orgNotes]) expect(documentSourceHash(document)).toBe(sha(await readFile(document.filePath)));
      const skipped = await loadProjectContext(root, { config, includeScopedMemory: false });
      expect(skipped.sessionNotes).toEqual([]); expect(skipped.orgNotes).toEqual([]); expect(skipped.tasks).toEqual(context.tasks); expect(skipped.handoffs).toEqual(context.handoffs);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("same-length restored-mtime edits, atomic replacement and fresh enumeration never reuse old documents", async () => {
    const root = await fixture();
    try {
      const config = await readProjectConfig(root), paths = resolveProjectPaths(root, config), file = join(paths.tasksDir, "fresh.md");
      const firstBytes = Buffer.from(taskText("Alpha")); await writeFile(file, firstBytes); const times = await stat(file);
      const first = (await loadProjectContext(root)).tasks.find(task => task.filePath === file)!;
      await writeFile(file, taskText("Bravo")); await utimes(file, times.atime, times.mtime);
      const second = (await loadProjectContext(root)).tasks.find(task => task.filePath === file)!;
      expect(second.title).toBe("Bravo"); expect(second).not.toBe(first); expect(documentSourceHash(first)).toBe(sha(firstBytes)); expect(documentSourceHash(second)).toBe(sha(Buffer.from(taskText("Bravo"))));
      const replacement = join(paths.tasksDir, "replacement.tmp"); await writeFile(replacement, taskText("Gamma")); await rename(replacement, file);
      expect((await loadProjectContext(root)).tasks.find(task => task.filePath === file)?.title).toBe("Gamma");
      const moved = join(paths.tasksDir, "renamed.md"); await rename(file, moved); let loaded = await loadProjectContext(root);
      expect(loaded.tasks.some(task => task.filePath === file)).toBe(false); expect(loaded.tasks.find(task => task.filePath === moved)?.title).toBe("Gamma");
      await rm(moved); expect((await loadProjectContext(root)).tasks.some(task => task.filePath === moved)).toBe(false);
      await writeFile(file, "+++\ninvalid = [\n+++\n"); await expect(loadProjectContext(root)).rejects.toThrow();
      await writeFile(file, taskText("Fixed")); expect((await loadProjectContext(root)).tasks.find(task => task.filePath === file)?.title).toBe("Fixed");
      const configPath = join(root, ".specpm/config.toml"), configText = await readFile(configPath, "utf8"); await writeFile(configPath, configText.replace(/^project_name = .*$/m, 'project_name = "Fresh config"'));
      expect((await loadProjectContext(root)).config.projectName).toBe("Fresh config"); expect((await loadProjectContext(root, { config })).config).toBe(config);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("read failures reject the whole load with the same error and later loads still succeed", async () => {
    const root = await fixture();
    try {
      const error = Object.assign(new Error("controlled read failure"), { code: "EACCES" }); const original = readers.createDocumentReader;
      const factory = spyOn(readers, "createDocumentReader").mockImplementation(() => original((path, complete) => { if (path.endsWith("current.md")) complete(error); else callbackReadFile(path, complete); }));
      try { await expect(loadProjectContext(root)).rejects.toBe(error); } finally { factory.mockRestore(); }
      expect((await loadProjectContext(root)).tasks.length).toBeGreaterThan(0);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  test("raw invalid UTF8 bytes keep exact provenance and existing symlink inclusion/default-current behavior", async () => {
    const root = await fixture();
    try {
      const paths = resolveProjectPaths(root, await readProjectConfig(root)); await mkdir(join(paths.tasksDir, "nested"));
      const file = join(paths.tasksDir, "nested/real.md"), bytes = Buffer.concat([Buffer.from(taskText("Bytes", "TASK-BYTES")), Buffer.from([0xff])]); await writeFile(file, bytes);
      const standalone = await readers.readDocumentBytes(file); expect(Buffer.isBuffer(standalone)).toBe(true); expect(standalone).toEqual(bytes);
      await symlink(file, join(paths.tasksDir, "linked.md")); await symlink(join(paths.tasksDir, "nested"), join(paths.tasksDir, "linked-dir"));
      let context = await loadProjectContext(root); const task = context.tasks.find(task => task.id === "TASK-BYTES")!;
      expect(context.tasks.filter(task => task.id === "TASK-BYTES")).toHaveLength(1); expect(task.body).toContain("\ufffd"); expect(documentSourceHash(task)).toBe(sha(bytes));
      await rm(paths.stateFile); context = await loadProjectContext(root); expect(context.currentState.summary).toBe("No current state file exists yet."); expect(documentSourceHash(context.currentState)).toBeNull();
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
