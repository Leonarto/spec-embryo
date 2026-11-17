import {open, lstat, rename, unlink} from "node:fs/promises";
import type {BigIntStats} from "node:fs";
import {constants} from "node:fs";
import {createHash, randomUUID} from "node:crypto";
import {dirname, join} from "node:path";
import type {FileHandle} from "node:fs/promises";
import type {LockLease} from "./storage.ts";
import {SpecQuestionWriteError} from "./services/spec-questions.ts";

/** Internal operation seam for deterministic fault/barrier tests; never exported by the public entry point. */
export const specAnswerWriteIO = {
  open, lstat, rename, unlink, randomUUID,
  write: (handle: FileHandle, bytes: Buffer) => handle.writeFile(bytes),
  sync: (handle: FileHandle) => handle.sync(),
  chmod: (handle: FileHandle, mode: number) => handle.chmod(mode),
  close: (handle: FileHandle) => handle.close(),
};
export const specAnswerRevision = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const sameFile = (left: BigIntStats, right: BigIntStats) => left.dev === right.dev && left.ino === right.ino;
const sameStamp = (left: BigIntStats, right: BigIntStats) => sameFile(left, right) && left.size === right.size && left.mode === right.mode && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
const changed = () => new SpecQuestionWriteError("conflict", "Spec changed before the answer write could commit.", "target_changed");
const temporaryChanged = () => new Error("Spec answer temporary file ownership or bytes could not be verified.");
const codeOf = (error: unknown) => (error as NodeJS.ErrnoException)?.code;

async function regularTarget(path: string): Promise<BigIntStats> {
  try {
    const stat = await specAnswerWriteIO.lstat(path, {bigint: true});
    if (!stat.isFile() || stat.isSymbolicLink()) throw changed();
    return stat;
  } catch (error) { if (codeOf(error) === "ENOENT" || codeOf(error) === "ENOTDIR") throw changed(); throw error; }
}

async function verifyLease(lockPath: string, lease: Readonly<LockLease>): Promise<void> {
  let handle: FileHandle | undefined;
  try {
    if (lease.lockPath !== lockPath || lease.pid !== process.pid) throw new Error();
    const ownerPath = join(lockPath, "owner.json"), before = await specAnswerWriteIO.lstat(ownerPath, {bigint: true});
    if (!before.isFile() || before.isSymbolicLink() || before.size > 4096n) throw new Error();
    handle = await specAnswerWriteIO.open(ownerPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
    const opened = await handle.stat({bigint: true});
    if (!opened.isFile() || !sameFile(before, opened)) throw new Error();
    const bytes = Buffer.alloc(4097), {bytesRead} = await handle.read(bytes, 0, bytes.length, 0);
    if (bytesRead > 4096) throw new Error();
    const owner = JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes.subarray(0, bytesRead)));
    if (owner.token !== lease.token || owner.pid !== lease.pid || !sameFile(opened, await specAnswerWriteIO.lstat(ownerPath, {bigint: true}))) throw new Error();
  } catch { throw new Error("Spec answer write lock ownership could not be verified."); }
  finally { await handle?.close(); }
}

async function verifyTarget(path: string, expectedRevision: string, initial: BigIntStats): Promise<void> {
  let handle: FileHandle | undefined;
  try {
    const before = await regularTarget(path);
    if (!sameStamp(initial, before)) throw changed();
    handle = await specAnswerWriteIO.open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
    const opened = await handle.stat({bigint: true});
    if (!opened.isFile() || !sameStamp(before, opened)) throw changed();
    const bytes = await handle.readFile();
    if (specAnswerRevision(bytes) !== expectedRevision || !sameStamp(opened, await handle.stat({bigint: true})) || !sameStamp(opened, await regularTarget(path))) throw changed();
  } catch (error) { if (["ENOENT", "ENOTDIR", "ELOOP"].includes(codeOf(error) ?? "")) throw changed(); throw error; }
  finally { await handle?.close(); }
}

async function verifyTemporary(path: string, owned: BigIntStats, length: number, preparedRevision: string): Promise<BigIntStats> {
  let handle: FileHandle | undefined;
  try {
    const before = await specAnswerWriteIO.lstat(path, {bigint: true});
    if (!before.isFile() || before.isSymbolicLink() || !sameFile(before, owned) || before.size !== BigInt(length)) throw temporaryChanged();
    handle = await specAnswerWriteIO.open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
    const opened = await handle.stat({bigint: true});
    if (!opened.isFile() || !sameFile(opened, owned) || !sameStamp(before, opened)) throw temporaryChanged();
    // Bound observation even if another process grows the file after stat.
    const bytes = Buffer.alloc(length + 1); let total = 0;
    while (total < bytes.length) {
      const {bytesRead} = await handle.read(bytes, total, bytes.length - total, total);
      if (!bytesRead) break;
      total += bytesRead;
    }
    if (total !== length || specAnswerRevision(bytes.subarray(0, total)) !== preparedRevision || !sameStamp(opened, await handle.stat({bigint: true})) || !sameStamp(opened, await specAnswerWriteIO.lstat(path, {bigint: true}))) throw temporaryChanged();
    return opened;
  } catch (error) { if (["ENOENT", "ENOTDIR", "ELOOP"].includes(codeOf(error) ?? "")) throw temporaryChanged(); throw error; }
  finally { await handle?.close(); }
}

/** Answer-only atomic replacement; final-check→rename remains a race for noncooperating external writers. */
export async function commitSpecAnswers(path: string, expectedRevision: string, bytes: Buffer, lockPath: string, lease: Readonly<LockLease>, onCommitted: () => void): Promise<void> {
  const preparedRevision = specAnswerRevision(bytes);
  const initial = await regularTarget(path), mode = Number(initial.mode & 0o777n);
  const temporary = join(dirname(path), `.spm-answer-${specAnswerWriteIO.randomUUID()}.tmp`);
  let handle: FileHandle | undefined, owned: BigIntStats | undefined, committed = false;
  try {
    handle = await specAnswerWriteIO.open(temporary, "wx", mode);
    owned = await handle.stat({bigint: true});
    await specAnswerWriteIO.write(handle, bytes);
    await specAnswerWriteIO.chmod(handle, mode); // Preserve ordinary permissions independently of umask.
    await specAnswerWriteIO.sync(handle);
    await specAnswerWriteIO.close(handle); handle = undefined;
    const verifiedTemporary = await verifyTemporary(temporary, owned, bytes.length, preparedRevision);
    await verifyTarget(path, expectedRevision, initial);
    await verifyLease(lockPath, lease);
    if (!sameStamp(initial, await regularTarget(path))) throw changed();
    const latestTemporary = await specAnswerWriteIO.lstat(temporary, {bigint: true});
    if (!latestTemporary.isFile() || latestTemporary.isSymbolicLink() || !sameStamp(verifiedTemporary, latestTemporary)) throw temporaryChanged();
    await specAnswerWriteIO.rename(temporary, path);
    committed = true;
    onCommitted(); // Only the caller's precomputed result assignment; no IO/reload after confirmed rename.
  } finally {
    try { if (handle) await handle.close(); }
    finally {
      if (owned && !committed) {
        try { const current = await specAnswerWriteIO.lstat(temporary, {bigint: true}); if (current.isFile() && sameFile(owned, current)) await specAnswerWriteIO.unlink(temporary); }
        catch (error) { if (codeOf(error) !== "ENOENT") throw error; }
      }
    }
  }
}
