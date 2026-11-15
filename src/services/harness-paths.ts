import { constants } from "node:fs";
import { lstat, mkdir, open, realpath, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";

export class HarnessPathError extends Error { readonly exitCode = 2; }

function isInside(root: string, path: string): boolean {
  const local = relative(root, path);
  return local !== ".." && !local.startsWith("../") && !local.startsWith("..\\") && !isAbsolute(local);
}

export async function containedHarnessPath(rootDir: string, localPath: string): Promise<string> {
  const root = await realpath(rootDir);
  if (isAbsolute(localPath) || !isInside(root, resolve(root, localPath))) throw new HarnessPathError("Path is outside the managed project root.");
  const parts = relative(root, resolve(root, localPath)).split(/[\\/]/).filter(Boolean);
  let cursor = root;
  for (const [index, part] of parts.entries()) {
    cursor = join(cursor, part);
    try {
      const canonical = await realpath(cursor);
      if (!isInside(root, canonical)) throw new HarnessPathError("Path resolves outside the managed project root.");
      cursor = canonical;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      try {
        if ((await lstat(cursor)).isSymbolicLink()) throw new HarnessPathError("Project path contains an unresolved symlink.");
      } catch (statError) { if ((statError as NodeJS.ErrnoException).code !== "ENOENT") throw statError; }
      return join(cursor, ...parts.slice(index + 1));
    }
  }
  return cursor;
}

export async function readHarnessText(rootDir: string, localPath: string, maxBytes = 1048576): Promise<string | null> {
  const path = await containedHarnessPath(rootDir, localPath);
  let handle;
  try {
    if (!(await lstat(path)).isFile()) throw new HarnessPathError("Expected a regular project file.");
    handle = await open(path, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0) | (constants.O_NOFOLLOW ?? 0));
    const stat = await handle.stat();
    if (!stat.isFile()) throw new HarnessPathError("Expected a regular project file.");
    if (stat.size > maxBytes) throw new HarnessPathError(`Project file exceeds ${maxBytes} bytes.`);
    const buffer = Buffer.alloc(maxBytes + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const part = await handle.read(buffer, bytesRead, buffer.length - bytesRead, bytesRead);
      if (!part.bytesRead) break;
      bytesRead += part.bytesRead;
    }
    if (bytesRead > maxBytes) throw new HarnessPathError(`Project file exceeds ${maxBytes} bytes.`);
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, bytesRead));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  } finally { await handle?.close(); }
}

export async function atomicWriteHarnessText(rootDir: string, localPath: string, text: string): Promise<void> {
  const path = await containedHarnessPath(rootDir, localPath);
  const parent = dirname(path);
  await mkdir(parent, { recursive: true });
  // Recheck all parents after creation, before writing a temp file.
  const verified = await containedHarnessPath(rootDir, localPath);
  if (verified !== path) throw new HarnessPathError("Project target changed during preparation.");
  const temporary = join(parent, `.${basename(path)}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, text, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await rename(temporary, path);
  } finally { await rm(temporary, { force: true }); }
}

export async function resolveManagedHookRoot(startDir: string): Promise<string | null> {
  let cursor = await realpath(startDir);
  while (true) {
    try {
      await lstat(join(cursor, ".specpm/config.toml"));
      // Validates real parents, regular type, bounded bytes and UTF-8.
      if (await readHarnessText(cursor, ".specpm/config.toml") !== null) return cursor;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    try { await lstat(join(cursor, ".git")); return null; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    const parent = dirname(cursor);
    if (parent === cursor) return null;
    cursor = parent;
  }
}
