import { createHash } from "node:crypto";

// Identity-scoped provenance: a clone or later load must never inherit stale bytes.
const sourceHashes = new WeakMap<object, string>();

export function registerDocumentSource<T>(document: T, bytes: Uint8Array): T {
  if (typeof document === "object" && document !== null) {
    sourceHashes.set(document, createHash("sha256").update(bytes).digest("hex"));
  }
  return document;
}

export function documentSourceHash(document: object): string | null {
  return sourceHashes.get(document) ?? null;
}
