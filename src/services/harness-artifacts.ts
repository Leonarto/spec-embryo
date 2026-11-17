import { randomUUID } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { BackendName } from "../domain.ts";

export interface HarnessArtifactReservation {
  directory: string;
  token: string;
  markerWritten: boolean;
}

export async function reserveHarnessArtifacts(rootDir: string, backend: BackendName): Promise<HarnessArtifactReservation> {
  const parent = join(rootDir, ".specpm", "tmp");
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(join(parent, `${backend}-`));
  return { directory, token: randomUUID(), markerWritten: false };
}

export async function markHarnessArtifacts(reservation: HarnessArtifactReservation): Promise<void> {
  await writeFile(join(reservation.directory, ".spm-run.json"), JSON.stringify({
    owner: "spm", schema_version: 1, id: basename(reservation.directory), token: reservation.token,
    created_at: new Date().toISOString(),
  }), { encoding: "utf8", mode: 0o600, flag: "wx" });
  reservation.markerWritten = true;
}

export async function writeHarnessArtifactFiles(entries: ReadonlyArray<readonly [string, string]>): Promise<void> {
  for (const [path, content] of entries) {
    await writeFile(path, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
  }
}

export async function cleanupHarnessArtifacts(reservation: HarnessArtifactReservation): Promise<string | undefined> {
  try {
    const stat = await lstat(reservation.directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return "Artifact directory ownership could not be verified; retained for inspection.";
    if (reservation.markerWritten) {
      let marker;
      try { marker = JSON.parse(await readFile(join(reservation.directory, ".spm-run.json"), "utf8")); }
      catch { return "Artifact ownership marker is unavailable; retained for inspection."; }
      if (marker.owner !== "spm" || marker.schema_version !== 1 || marker.token !== reservation.token || marker.id !== basename(reservation.directory)) {
        return "Artifact ownership marker changed; retained for inspection.";
      }
    }
    // Only a directory reserved by this invocation is ever eligible. No stale-dir scan.
    await rm(reservation.directory, { recursive: true });
    return undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    return `Could not clean owned artifacts: ${error instanceof Error ? error.message : String(error)}`;
  }
}
