import { readdir, mkdir, readFile, writeFile, access, rm, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, extname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function readUtf8(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

export async function writeUtf8(filePath: string, content: string): Promise<void> {
  await ensureDir(dirname(filePath));
  await writeFile(filePath, content, "utf8");
}

export async function writeIfMissing(filePath: string, content: string): Promise<boolean> {
  if (await pathExists(filePath)) {
    return false;
  }

  await writeUtf8(filePath, content);
  return true;
}

export async function listMarkdownFiles(dirPath: string): Promise<string[]> {
  if (!(await pathExists(dirPath))) {
    return [];
  }

  const entries = await readdir(dirPath, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listMarkdownFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && extname(entry.name) === ".md" && entry.name !== "AGENTS.md") {
      results.push(fullPath);
    }
  }

  return results.sort();
}

interface LockOptions {
  timeoutMs?: number;
  retryDelayMs?: number;
  staleMs?: number;
}

interface LockOwnerRecord {
  token: string;
  pid: number;
  acquired_at: string;
  heartbeat_at: string;
}

export interface LockLease {
  readonly lockPath: string;
  readonly token: string;
  readonly pid: number;
}

function ownerFilePath(lockPath: string): string {
  return join(lockPath, "owner.json");
}

async function writeLockOwner(lockPath: string, owner: LockOwnerRecord): Promise<void> {
  await writeFile(ownerFilePath(lockPath), JSON.stringify(owner), "utf8");
}

async function readLockOwner(lockPath: string): Promise<LockOwnerRecord | null> {
  try {
    const raw = await readFile(ownerFilePath(lockPath), "utf8");
    return JSON.parse(raw) as LockOwnerRecord;
  } catch {
    return null;
  }
}

async function lockAgeMs(lockPath: string): Promise<number | null> {
  try {
    const ownerStats = await stat(ownerFilePath(lockPath));
    return Date.now() - ownerStats.mtimeMs;
  } catch {
    try {
      const lockStats = await stat(lockPath);
      return Date.now() - lockStats.mtimeMs;
    } catch {
      return null;
    }
  }
}

async function removeLockIfStale(lockPath: string, staleMs: number): Promise<boolean> {
  const ageMs = await lockAgeMs(lockPath);
  if (ageMs === null || ageMs < staleMs) {
    return false;
  }

  try {
    await rm(lockPath, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

async function releaseLock(lockPath: string, token: string): Promise<void> {
  const owner = await readLockOwner(lockPath);
  if (!owner || owner.token !== token) {
    return;
  }

  await rm(lockPath, { recursive: true, force: true });
}

async function startLockHeartbeat(lockPath: string, owner: LockOwnerRecord, staleMs: number): Promise<() => Promise<void>> {
  const heartbeatMs = Math.max(25, Math.min(1_000, Math.floor(staleMs / 3)));
  let stopped = false;
  let inFlight: Promise<void> | null = null;

  const tick = async (): Promise<void> => {
    if (stopped) {
      return;
    }

    const currentOwner = await readLockOwner(lockPath);
    if (!currentOwner || currentOwner.token !== owner.token) {
      stopped = true;
      return;
    }

    const nextOwner: LockOwnerRecord = {
      ...owner,
      heartbeat_at: new Date().toISOString(),
    };
    await writeLockOwner(lockPath, nextOwner);
    owner = nextOwner;
  };

  const interval = setInterval(() => {
    if (stopped) {
      return;
    }

    inFlight = tick().catch(() => {
      stopped = true;
    });
  }, heartbeatMs);
  interval.unref?.();

  return async () => {
    stopped = true;
    clearInterval(interval);
    if (inFlight) {
      await inFlight;
    }
  };
}

export async function withLock<T>(lockPath: string, work: (lease: Readonly<LockLease>) => Promise<T>, options: LockOptions = {}): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const retryDelayMs = options.retryDelayMs ?? 50;
  const staleMs = options.staleMs ?? 30_000;
  const deadline = Date.now() + timeoutMs;

  await ensureDir(dirname(lockPath));

  let owner: LockOwnerRecord | null = null;

  while (true) {
    try {
      await mkdir(lockPath);
      owner = {
        token: randomUUID(),
        pid: process.pid,
        acquired_at: new Date().toISOString(),
        heartbeat_at: new Date().toISOString(),
      };
      await writeLockOwner(lockPath, owner);
      break;
    } catch (error) {
      const code = error instanceof Error && "code" in error ? error.code : undefined;
      if (code !== "EEXIST") {
        throw error;
      }

      const cleared = await removeLockIfStale(lockPath, staleMs);
      if (cleared) {
        continue;
      }

      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for lock: ${lockPath}`);
      }

      await delay(retryDelayMs);
    }
  }

  const lockOwner = owner!;
  const stopHeartbeat = await startLockHeartbeat(lockPath, lockOwner, staleMs);

  try {
    return await work(Object.freeze({ lockPath, token: lockOwner.token, pid: lockOwner.pid }));
  } finally {
    await stopHeartbeat();
    await releaseLock(lockPath, lockOwner.token);
  }
}
