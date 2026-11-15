import { readFile } from "node:fs";

export type DocumentReader = (filePath: string) => Promise<Buffer>;
export type CallbackDocumentReader = (
  filePath: string,
  complete: (error: NodeJS.ErrnoException | null, bytes?: Buffer) => void,
) => void;
const readBuffer: CallbackDocumentReader = (filePath, complete) => readFile(filePath, complete);

/** Fresh standalone read; decoding and provenance stay with the repository parser. */
export const readDocumentBytes: DocumentReader = (filePath) => new Promise((resolve, reject) => {
  readBuffer(filePath, (error, bytes) => error ? reject(error) : resolve(bytes!));
});

/** Internal per-load FIFO, with one Buffer read per admitted document and no cache. */
export function createDocumentReader(read: CallbackDocumentReader = readBuffer): DocumentReader {
  type Job = { filePath: string; resolve: (bytes: Buffer) => void; reject: (error: unknown) => void };
  const queue: Array<Job | undefined> = [];
  let cursor = 0;
  let active = 0;
  let draining = false;

  function drain(): void {
    if (draining) return;
    draining = true;
    try {
      while (active < 64 && cursor < queue.length) {
        const job = queue[cursor]!;
        queue[cursor++] = undefined;
        active += 1;
        let settled = false;
        const complete = (error: unknown, bytes?: Buffer) => {
          if (settled) return;
          settled = true;
          active -= 1;
          if (error !== null && error !== undefined) job.reject(error);
          else job.resolve(bytes!);
          // Synchronous callbacks/setup failures stay in the outer drain loop.
          drain();
        };
        try { read(job.filePath, complete); }
        catch (error) { complete(error); }
      }
      if (cursor === queue.length) {
        queue.length = 0;
        cursor = 0;
      }
    } finally { draining = false; }
  }

  return (filePath) => new Promise((resolve, reject) => {
    queue.push({ filePath, resolve, reject });
    drain();
  });
}
