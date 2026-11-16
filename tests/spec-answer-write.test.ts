import {test, expect, spyOn} from "bun:test";
import * as fs from "node:fs/promises";
import {join, dirname} from "node:path";
import {tmpdir} from "node:os";
import {createHash} from "node:crypto";
import {answerSpecOpenQuestions, initializeProject, createSpec, loadProjectContext} from "../src/repository.ts";
import {parseTomlFrontmatter, serializeTomlFrontmatter} from "../src/frontmatter.ts";
import * as frontmatter from "../src/frontmatter.ts";
import {applySpecAnswers, normalizeQuestion, SpecQuestionWriteError} from "../src/services/spec-questions.ts";
import {documentSourceHash} from "../src/services/document-provenance.ts";
import {specAnswerWriteIO as io} from "../src/spec-answer-write.ts";
import {applySpecAnswers as legacyApply} from "./fixtures/spec-answer-baseline/questions.ts";
import {serializeSpecDocument as legacySerialize} from "./fixtures/spec-answer-baseline/serializer.ts";

const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const body = "# Purpose\n\nKeep context.\n\n## Open Questions\n\n- Choose mode?\n- Keep pending?\n\n## Other section\n\nPreserve this section.\n";
type Fixture = {root: string; id: string; path: string; bytes: Buffer};
async function fixture(run: (f: Fixture) => Promise<void>, sourceBody = body) {
  const root = await fs.mkdtemp(join(tmpdir(), "spm-answer-write-"));
  try {
    await initializeProject(root);
    const spec = await createSpec(root, {title: "Guarded answers", summary: "Known fields", status: "active", tags: ["kept"]});
    const {attributes} = parseTomlFrontmatter(await fs.readFile(spec.filePath, "utf8"));
    const bytes = Buffer.from(serializeTomlFrontmatter(attributes as Record<string, unknown>, sourceBody));
    await fs.writeFile(spec.filePath, bytes);
    await run({root, id: spec.id, path: spec.filePath, bytes});
  } finally { await fs.rm(root, {recursive: true, force: true}); }
}
const answers = [{question: "Choose mode?", answer: "Use the shared lock."}];
async function temporaryFiles(path: string) { return (await fs.readdir(dirname(path))).filter(name => name.includes(".spm-answer-")); }
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => {resolve = done;}); return {promise, resolve}; }
async function duringWrite(f: Fixture, edit: () => Promise<void>, expectedRevision?: string): Promise<unknown> {
  const entered = deferred(), release = deferred(), write = io.write;
  const spy = spyOn(io, "write").mockImplementation(async (handle, bytes) => {entered.resolve(); await release.promise; await write(handle, bytes);});
  const operation = answerSpecOpenQuestions(f.root, f.id, answers, expectedRevision ? {expectedRevision} : undefined);
  try {
    await Promise.race([entered.promise, operation.then(() => {throw new Error("Expected the write barrier");})]);
    await edit(); release.resolve();
    return await operation.then(() => {throw new Error("Expected rejection");}, error => error);
  } finally {release.resolve(); await operation.catch(() => {}); spy.mockRestore();}
}

test("legacy three-argument bytes match the pinned serializer/question oracle and return exact committed digest", async () => {
  await fixture(async f => {
    // Canonical fields and unrelated sections changed BEFORE load must survive; unknown keys retain legacy omission.
    const parsed = parseTomlFrontmatter(f.bytes.toString());
    const bytes = Buffer.from(serializeTomlFrontmatter({...parsed.attributes as object, owner: "New owner", custom_key: "legacy omitted"}, `${body}\n## Added context\n\nLoaded fresh.\n`));
    await fs.writeFile(f.path, bytes);
    const before = (await loadProjectContext(f.root)).specs.find(spec => spec.id === f.id)!;
    const result = await answerSpecOpenQuestions(f.root, f.id, answers), actual = await fs.readFile(f.path);
    const applied = legacyApply(before.body, answers);
    expect(actual).toEqual(Buffer.from(legacySerialize({...before, body: applied.body, updatedAt: result.spec.updatedAt}, result.spec.updatedAt!)));
    expect(result.answeredQuestions).toEqual(applied.answeredQuestions);
    expect(result.remainingQuestions).toEqual(applied.remainingQuestions.map(q => q.question));
    expect(actual.toString()).toContain('owner = "New owner"'); expect(actual.toString()).toContain("Loaded fresh.");
    expect(actual.toString()).not.toContain("custom_key");
    expect(result.committedRevision).toBe(digest(actual)); expect(result.cleanupWarning).toBeUndefined();
    expect(documentSourceHash(result.spec)).toBeNull();
    expect(documentSourceHash((await loadProjectContext(f.root)).specs.find(spec => spec.id === f.id)!)).toBe(result.committedRevision);
    expect(await temporaryFiles(f.path)).toEqual([]);
  });
});

test("matching expected revision succeeds, own undefined is optional omission, malformed tokens reject before lock IO", async () => {
  for (const guarded of [true, false]) await fixture(async f => {
    const result = await answerSpecOpenQuestions(f.root, f.id, answers, {expectedRevision: guarded ? digest(f.bytes) : undefined});
    expect(result.committedRevision).toBe(digest(await fs.readFile(f.path)));
  });
  const parent = await fs.mkdtemp(join(tmpdir(), "spm-answer-malformed-")), root = join(parent, "not-created");
  try {
    for (const token of [null, "", 1, {}, "A".repeat(64), "x".repeat(64), "a".repeat(63)]) {
      const error = await answerSpecOpenQuestions(root, "SPEC-1", answers, {expectedRevision: token as string}).catch(error => error);
      expect(error).toBeInstanceOf(SpecQuestionWriteError); expect(error).toMatchObject({code: "validation", reason: "expected_revision"});
    }
    expect(await fs.readdir(parent)).toEqual([]);
  } finally {await fs.rm(parent, {recursive: true, force: true});}
});

test("revision checks hash exact CRLF/UTF8 input bytes; committed digest hashes exact serialized UTF8", async () => {
  await fixture(async f => {
    const crlf = Buffer.from(f.bytes.toString().replaceAll("\n", "\r\n")); await fs.writeFile(f.path, crlf);
    const stale = await answerSpecOpenQuestions(f.root, f.id, answers, {expectedRevision: digest(f.bytes)}).catch(error => error);
    expect(stale).toMatchObject({code: "conflict", reason: "revision"}); expect(await fs.readFile(f.path)).toEqual(crlf);
    const result = await answerSpecOpenQuestions(f.root, f.id, [{question: "Choose mode?", answer: "Sí · decisión ☑️"}], {expectedRevision: digest(crlf)}), written = await fs.readFile(f.path);
    expect(result.committedRevision).toBe(digest(written)); expect(written.byteLength).toBeGreaterThan(written.toString().length); expect(written.toString()).toContain("Sí · decisión ☑️");
  });
});

test("the validated revision value cannot be changed by mutating options while waiting for IO", async () => {
  await fixture(async f => {
    const options: {expectedRevision?: string} = {expectedRevision: "0".repeat(64)};
    const operation = answerSpecOpenQuestions(f.root, f.id, answers, options); options.expectedRevision = undefined;
    await expect(operation).rejects.toMatchObject({code: "conflict", reason: "revision"}); expect(await fs.readFile(f.path)).toEqual(f.bytes);
  });
});

test("stale digest including changed surrounding text and stale pairs reject the whole batch without writes", async () => {
  await fixture(async f => {
    const changed = Buffer.from(f.bytes.toString().replace("Keep context.", "Edited externally.")); await fs.writeFile(f.path, changed);
    const stale = await answerSpecOpenQuestions(f.root, f.id, answers, {expectedRevision: digest(f.bytes)}).catch(error => error);
    expect(stale).toMatchObject({code: "conflict", reason: "revision"}); expect(await fs.readFile(f.path)).toEqual(changed);
    const removed = await answerSpecOpenQuestions(f.root, f.id, [...answers, {question: "Removed question?", answer: "No"}]).catch(error => error);
    expect(removed).toMatchObject({code: "conflict", reason: "question"}); expect(await fs.readFile(f.path)).toEqual(changed);
    expect(await temporaryFiles(f.path)).toEqual([]);
    const missing = await answerSpecOpenQuestions(f.root, "SPEC-MISSING", answers).catch(error => error); expect(missing).toMatchObject({code: "not_found"}); expect(missing).toBeInstanceOf(Error);
  });
  await fixture(async f => {const error = await answerSpecOpenQuestions(f.root, f.id, answers).catch(error => error); expect(error).toMatchObject({code: "conflict", reason: "question"}); expect(await fs.readFile(f.path)).toEqual(f.bytes);}, "# No questions\n\nBody.\n");
});

test("blank/equal duplicate answers resolve all normalized occurrences in canonical order; contradictory duplicates do not write", async () => {
  const repeated = "# Questions\n\n## Open Questions\n\n- Choose   mode?\n- Keep pending?\n- Choose mode?\n";
  await fixture(async f => {
    expect(normalizeQuestion(" Choose\t  mode? ")).toBe("Choose mode?");
    const result = await answerSpecOpenQuestions(f.root, f.id, [{question: "Keep pending?", answer: "  "}, {question: "Choose  mode?", answer: " Yes "}, {question: "Choose mode?", answer: "Yes"}]);
    expect(result.answeredQuestions).toEqual(["Choose mode?", "Choose mode?"]); expect(result.remainingQuestions).toEqual(["Keep pending?"]);
    expect((await fs.readFile(f.path, "utf8")).match(/Question: Choose mode\?/g)).toHaveLength(2);
  }, repeated);
  await fixture(async f => {
    const error = await answerSpecOpenQuestions(f.root, f.id, [{question: "Choose  mode?", answer: "Yes"}, {question: "Choose mode?", answer: "No"}]).catch(error => error);
    expect(error).toMatchObject({code: "validation", reason: "answers"}); expect(await fs.readFile(f.path)).toEqual(f.bytes);
    expect(() => applySpecAnswers(body, [{question: "Choose mode?", answer: " "}])).toThrow("At least one answered question");
  });
});

test("two same-revision saves serialize through the existing lock: exactly one commit and one conflict", async () => {
  await fixture(async f => {
    const results = await Promise.allSettled(["A", "B"].map(answer => answerSpecOpenQuestions(f.root, f.id, [{question: "Choose mode?", answer}], {expectedRevision: digest(f.bytes)})));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    const failed = results.find(r => r.status === "rejected") as PromiseRejectedResult; expect(failed.reason).toMatchObject({code: "conflict", reason: "revision"});
    const written = results.find(r => r.status === "fulfilled") as PromiseFulfilledResult<Awaited<ReturnType<typeof answerSpecOpenQuestions>>>;
    expect(written.value.committedRevision).toBe(digest(await fs.readFile(f.path))); expect(await temporaryFiles(f.path)).toEqual([]);
  });
});

test("controlled external edit between load and final check is detected for tokenless and guarded callers", async () => {
  for (const guarded of [false, true]) await fixture(async f => {
    const external = Buffer.from(f.bytes.toString() + "\nExternal bytes retained.\n");
    const error = await duringWrite(f, () => fs.writeFile(f.path, external), guarded ? digest(f.bytes) : undefined);
    expect(error).toMatchObject({code: "conflict", reason: "target_changed"}); expect(await fs.readFile(f.path)).toEqual(external); expect(await temporaryFiles(f.path)).toEqual([]);
  });
});

test("changed leaf, missing target and lost lease fail before rename, preserving foreign state", async () => {
  for (const kind of ["symlink", "directory", "missing", "lease"] as const) await fixture(async f => {
    const foreign = join(f.root, "foreign.md"); await fs.writeFile(foreign, "Foreign bytes.");
    const lockPath = join(f.root, ".specpm", "locks", "document-create.lock");
    const error = await duringWrite(f, async () => {
      if (kind === "lease") {const ownerPath = join(lockPath, "owner.json"), owner = JSON.parse(await fs.readFile(ownerPath, "utf8")); await fs.writeFile(ownerPath, JSON.stringify({...owner, token: "foreign-owner"}));}
      else {await fs.unlink(f.path); if (kind === "symlink") await fs.symlink(foreign, f.path); if (kind === "directory") await fs.mkdir(f.path);}
    });
    if (kind === "lease") {expect(error).toBeInstanceOf(Error); expect(error).not.toBeInstanceOf(SpecQuestionWriteError); expect((error as Error).message).toBe("Spec answer write lock ownership could not be verified."); expect(await fs.readFile(f.path)).toEqual(f.bytes); expect(JSON.parse(await fs.readFile(join(lockPath, "owner.json"), "utf8")).token).toBe("foreign-owner");}
    else expect(error).toMatchObject({code: "conflict", reason: "target_changed"});
    if (kind === "symlink") expect((await fs.lstat(f.path)).isSymbolicLink()).toBe(true);
    if (kind === "directory") expect((await fs.lstat(f.path)).isDirectory()).toBe(true);
    expect(await fs.readFile(foreign, "utf8")).toBe("Foreign bytes."); expect(await temporaryFiles(f.path)).toEqual([]);
  });
});

test("same-directory replacement preserves ordinary permissions and leaves no temp", async () => {
  await fixture(async f => {
    await fs.chmod(f.path, 0o640); const original = io.rename; let observed = false;
    const spy = spyOn(io, "rename").mockImplementation(async (source, target) => {expect(dirname(String(source))).toBe(dirname(f.path)); expect(String(target)).toBe(f.path); expect((await fs.stat(String(source))).mode & 0o777).toBe(0o640); observed = true; await original(source, target);});
    try {await answerSpecOpenQuestions(f.root, f.id, answers);} finally {spy.mockRestore();}
    expect(observed).toBe(true); expect((await fs.stat(f.path)).mode & 0o777).toBe(0o640); expect(await temporaryFiles(f.path)).toEqual([]);
  });
});

test("a valid long target basename does not overflow the atomic temp filename", async () => {
  await fixture(async f => {
    const target = join(dirname(f.path), `${"x".repeat(240)}.md`); await fs.rename(f.path, target);
    const result = await answerSpecOpenQuestions(f.root, f.id, answers, {expectedRevision: digest(f.bytes)});
    expect(result.spec.filePath).toBe(target); expect(result.committedRevision).toBe(digest(await fs.readFile(target))); expect(await temporaryFiles(target)).toEqual([]);
  });
});

test("serialization failure and partial temp/write/sync/chmod/close/rename failures preserve original bytes and clean owned temps", async () => {
  await fixture(async f => {
    const spy = spyOn(frontmatter, "serializeTomlFrontmatter").mockImplementation(() => {throw new Error("serialization fault");});
    try {await expect(answerSpecOpenQuestions(f.root, f.id, answers)).rejects.toThrow("serialization fault");} finally {spy.mockRestore();}
    expect(await fs.readFile(f.path)).toEqual(f.bytes); expect(await temporaryFiles(f.path)).toEqual([]);
  });
  for (const phase of ["write", "sync", "chmod", "close", "rename"] as const) await fixture(async f => {
    const spy = spyOn(io, phase).mockImplementation((async (...args: any[]) => {if (phase === "write") await args[0].writeFile("Partial owned temp."); throw new Error(`${phase} fault`);}) as never);
    try {await expect(answerSpecOpenQuestions(f.root, f.id, answers)).rejects.toThrow(`${phase} fault`);} finally {spy.mockRestore();}
    expect(await fs.readFile(f.path)).toEqual(f.bytes); expect(await temporaryFiles(f.path)).toEqual([]);
  });
});

test("failed exclusive creation never removes a preexisting foreign temp", async () => {
  await fixture(async f => {
    const uuid = "collision", foreign = join(dirname(f.path), `.spm-answer-${uuid}.tmp`); await fs.writeFile(foreign, "Foreign temp.");
    const spy = spyOn(io, "randomUUID").mockReturnValue(uuid as `${string}-${string}-${string}-${string}-${string}`);
    try {await expect(answerSpecOpenQuestions(f.root, f.id, answers)).rejects.toMatchObject({code: "EEXIST"});} finally {spy.mockRestore();}
    expect(await fs.readFile(foreign, "utf8")).toBe("Foreign temp."); expect(await fs.readFile(f.path)).toEqual(f.bytes);
  });
});

test("cleanup does not remove a foreign replacement at an owned temp's old path", async () => {
  await fixture(async f => {
    let foreignPath = "";
    const spy = spyOn(io, "write").mockImplementation(async () => {
      const [name] = await temporaryFiles(f.path); foreignPath = join(dirname(f.path), name!);
      await fs.rename(foreignPath, join(dirname(f.path), "moved-owned.tmp")); await fs.writeFile(foreignPath, "Foreign replacement.");
      throw new Error("write fault after external temp replacement");
    });
    try {await expect(answerSpecOpenQuestions(f.root, f.id, answers)).rejects.toThrow("write fault");} finally {spy.mockRestore();}
    expect(await fs.readFile(foreignPath, "utf8")).toBe("Foreign replacement."); expect(await fs.readFile(f.path)).toEqual(f.bytes);
  });
});

test("successful temp writes followed by foreign replacement or same-inode mutation cannot commit different bytes", async () => {
  for (const kind of ["replacement", "mutation"] as const) await fixture(async f => {
    const write = io.write; let temporary = "";
    const writeSpy = spyOn(io, "write").mockImplementation(async (handle, bytes) => {
      await write(handle, bytes); const [name] = await temporaryFiles(f.path); temporary = join(dirname(f.path), name!);
      if (kind === "replacement") {await fs.rename(temporary, join(dirname(f.path), "moved-owned.tmp")); await fs.writeFile(temporary, "Foreign replacement.");}
      else await handle.write(Buffer.from("!"), 0, 1, 0);
    });
    const renameSpy = spyOn(io, "rename");
    try {
      const error = await answerSpecOpenQuestions(f.root, f.id, answers).catch(error => error);
      expect(error).toBeInstanceOf(Error); expect(error).not.toBeInstanceOf(SpecQuestionWriteError);
      expect(error.message).toBe("Spec answer temporary file ownership or bytes could not be verified."); expect(renameSpy).not.toHaveBeenCalled();
    } finally {writeSpy.mockRestore(); renameSpy.mockRestore();}
    expect(await fs.readFile(f.path)).toEqual(f.bytes);
    if (kind === "replacement") expect(await fs.readFile(temporary, "utf8")).toBe("Foreign replacement.");
    else expect(await temporaryFiles(f.path)).toEqual([]);
  });
});

test("temp changes after digest verification are caught by the last pre-rename stamp check", async () => {
  await fixture(async f => {
    const lstat = io.lstat; let edited = false;
    const statSpy = spyOn(io, "lstat").mockImplementation((async (path: any, options: any) => {
      if (!edited && String(path).endsWith("/document-create.lock/owner.json")) {
        edited = true; const [name] = await temporaryFiles(f.path), temporary = join(dirname(f.path), name!), bytes = await fs.readFile(temporary); bytes[0] = 33; await fs.writeFile(temporary, bytes);
      }
      return lstat(path, options);
    }) as never);
    const renameSpy = spyOn(io, "rename");
    try {const error = await answerSpecOpenQuestions(f.root, f.id, answers).catch(error => error); expect(edited).toBe(true); expect(error.message).toBe("Spec answer temporary file ownership or bytes could not be verified."); expect(renameSpy).not.toHaveBeenCalled();}
    finally {statSpy.mockRestore(); renameSpy.mockRestore();}
    expect(await fs.readFile(f.path)).toEqual(f.bytes); expect(await temporaryFiles(f.path)).toEqual([]);
  });
});

test("post-rename lock-release failure returns committed result/digest plus cleanup warning, with no target reread", async () => {
  await fixture(async f => {
    const lockPath = join(f.root, ".specpm", "locks", "document-create.lock"), rename = io.rename, remove = fs.rm, read = fs.readFile;
    let renamed = false, releaseFailed = false;
    const renameSpy = spyOn(io, "rename").mockImplementation(async (source, target) => {await rename(source, target); renamed = true;});
    const removeSpy = spyOn(fs, "rm").mockImplementation(async (path, options) => {if (String(path) === lockPath && !releaseFailed) {expect(renamed).toBe(true); releaseFailed = true; throw new Error("release fault");} return remove(path, options);});
    const readSpy = spyOn(fs, "readFile").mockImplementation(((path: any, ...args: any[]) => {if (renamed && String(path) === f.path) throw new Error("postcommit target reread"); return (read as any)(path, ...args);}) as never);
    let result!: Awaited<ReturnType<typeof answerSpecOpenQuestions>>;
    try {result = await answerSpecOpenQuestions(f.root, f.id, answers);} finally {readSpy.mockRestore(); removeSpy.mockRestore(); renameSpy.mockRestore();}
    expect(releaseFailed).toBe(true); expect(result.cleanupWarning).toBe("Spec answers were saved, but lock cleanup failed."); expect(result.committedRevision).toBe(digest(await fs.readFile(f.path))); expect(result.answeredQuestions).toEqual(["Choose mode?"]);
  });
});
