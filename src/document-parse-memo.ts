import { resolve } from "node:path";
import { parseTomlFrontmatter } from "./frontmatter.ts";

type DocumentParser<T> = (filePath: string, attributes: unknown, body: string) => T;
interface MemoLimits { maxEntries?: number; maxBytes?: number }
interface Entry { bytes: Buffer; value: Record<string, unknown>; arrayKeys: string[]; accounted: number }
const MAX_ENTRIES = 16384;
const MAX_BYTES = 32 * 1024 * 1024;

function bound(value: number | undefined, maximum: number): number {
  if (value === undefined) return maximum;
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new RangeError("Invalid document parse memo limit");
  return value;
}

/** Current pure repository parsers return flat records; other shapes retain ordinary parsing semantics. */
function stringArrayKeys(value: unknown): string[] | undefined {
  if (value === null || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) return;
  const arrayKeys: string[] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") return;
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!("value" in descriptor) || !descriptor.enumerable || !descriptor.writable || !descriptor.configurable) return;
    const item: unknown = descriptor.value;
    if (Array.isArray(item)) {
      if (Object.getPrototypeOf(item) !== Array.prototype) return;
      const keys = Reflect.ownKeys(item);
      if (keys.length !== item.length + 1 || keys.at(-1) !== "length" || !Object.getOwnPropertyDescriptor(item, "length")!.writable) return;
      for (let index = 0; index < item.length; index++) {
        if (keys[index] !== String(index)) return;
        const member = Object.getOwnPropertyDescriptor(item, String(index))!;
        if (!("value" in member) || !member.enumerable || !member.writable || !member.configurable || typeof member.value !== "string") return;
      }
      arrayKeys.push(key);
    } else if (item !== null && item !== undefined && typeof item !== "string" && typeof item !== "boolean" && !(typeof item === "number" && Number.isFinite(item))) return;
  }
  return arrayKeys;
}

function clone(value: Record<string, unknown>, arrayKeys: string[]): Record<string, unknown> {
  const copy = { ...value };
  for (const key of arrayKeys) copy[key] = (value[key] as string[]).slice();
  return copy;
}

/** Internal successful-value memo. Call only AFTER a fresh read, with pure canonical repository parsers.
 * Limits account retained bytes + UTF8 serialized canonical values, not total runtime heap.
 */
export function createDocumentParseMemo(limits: MemoLimits = {}) {
  if (limits === null || typeof limits !== "object" || Array.isArray(limits)) throw new RangeError("Invalid document parse memo limits");
  const maxEntries = bound(limits.maxEntries, MAX_ENTRIES);
  const maxBytes = bound(limits.maxBytes, MAX_BYTES);
  const entries = new Map<string, Entry>();
  const parserIds = new WeakMap<Function, number>();
  let nextParserId = 0;
  let accounted = 0;
  function remove(key: string): void {
    const previous = entries.get(key);
    if (previous) { entries.delete(key); accounted -= previous.accounted; }
  }
  return {
    parse<T>(filePath: string, bytes: Buffer, parser: DocumentParser<T>): T {
      let parserId = parserIds.get(parser);
      if (parserId === undefined) { parserId = ++nextParserId; parserIds.set(parser, parserId); }
      const key = JSON.stringify([resolve(filePath), filePath, parserId]);
      const previous = entries.get(key);
      if (previous && previous.bytes.equals(bytes)) {
        entries.delete(key); entries.set(key, previous);
        return clone(previous.value, previous.arrayKeys) as T;
      }
      remove(key);
      const { attributes, body } = parseTomlFrontmatter(bytes.toString("utf8"));
      const value = parser(filePath, attributes, body);
      const arrayKeys = stringArrayKeys(value);
      if (arrayKeys === undefined) return value;
      const size = bytes.length + Buffer.byteLength(JSON.stringify(value), "utf8");
      if (size > maxBytes) return value;
      const retained = clone(value as Record<string, unknown>, arrayKeys);
      while (entries.size >= maxEntries || accounted + size > maxBytes) remove(entries.keys().next().value!);
      entries.set(key, { bytes: Buffer.from(bytes), value: retained, arrayKeys, accounted: size });
      accounted += size;
      return clone(retained, arrayKeys) as T;
    },
  };
}
