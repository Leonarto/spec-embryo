import type { HarnessProtocol, HarnessProvider, NativeHarnessResult } from "../domain.ts";
import { utf8Prefix } from "./resume-render.ts";

export const NATIVE_LINE_MAX_BYTES = 262144;
export const NATIVE_TEXT_MAX_BYTES = 65536;
export const NATIVE_JSON_MAX_BYTES = 1048576;
export function validNativeSessionId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !value.startsWith("-") &&
    Buffer.byteLength(value, "utf8") <= 512 && !/[\s\p{Cc}\p{Cf}]/u.test(value);
}

function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
export interface NativeParser { write(chunk: Uint8Array): void; finish(): NativeHarnessResult }

class ResultState {
  private id: string | null = null;
  private idConflict = false;
  private terminal: "completed" | "failed" | null = null;
  private turnOpen = false;
  private text: string | null = null;
  private textTruncated = false;
  private fatal = false;
  private warnings: string[] = [];
  private omitted = 0;
  constructor(readonly provider: HarnessProvider, readonly protocol: HarnessProtocol) {}
  warn(message: string, fatal = false) {
    if (fatal) this.fatal = true;
    if (this.warnings.length < 32) this.warnings.push(utf8Prefix(message, 256)); else this.omitted += 1;
  }
  session(value: unknown) {
    if (value === undefined) return;
    if (!validNativeSessionId(value)) { this.idConflict = true; this.warn("Native session identity is invalid; it was not retained.", true); return; }
    if (this.id !== null && this.id !== value) { this.idConflict = true; this.warn("Native stream contains contradictory session identities.", true); return; }
    this.id = value;
  }
  end(value: "completed" | "failed") {
    this.turnOpen = false;
    if (this.terminal !== null && this.terminal !== value) this.warn("Native stream contains incompatible terminal events.", true);
    else this.terminal = value;
  }
  openTurn() { this.turnOpen = true; this.text = null; this.textTruncated = false; }
  finalText(value: unknown) {
    if (typeof value !== "string") return;
    this.textTruncated = Buffer.byteLength(value, "utf8") > NATIVE_TEXT_MAX_BYTES;
    this.text = utf8Prefix(value, NATIVE_TEXT_MAX_BYTES);
  }
  result(): NativeHarnessResult {
    return { provider: this.provider, protocol: this.protocol, session_id: this.idConflict ? null : this.id,
      terminal: this.fatal || this.turnOpen ? "unknown" : this.terminal ?? "unknown", final_text: this.text,
      final_text_truncated: this.textTruncated, warnings: [...this.warnings], warnings_omitted: this.omitted };
  }
}

function consumeCodex(state: ResultState, value: unknown) {
  if (!record(value)) return;
  if (value.type === "thread.started") state.session(value.thread_id);
  if (value.type === "turn.started") state.openTurn();
  if (value.type === "turn.completed") state.end("completed");
  if (value.type === "turn.failed" || value.type === "error") state.end("failed");
  if (value.type === "item.completed" && record(value.item) && value.item.type === "agent_message") state.finalText(value.item.text);
}
function consumeClaude(state: ResultState, value: unknown) {
  if (!record(value)) return;
  if (value.type === "system" && value.subtype === "init") state.session(value.session_id);
  if (value.type !== "result") return;
  state.session(value.session_id);
  if (value.is_error !== undefined && typeof value.is_error !== "boolean") state.warn("Native result has an invalid error-state field.", true);
  if (value.is_error === true || (typeof value.subtype === "string" && value.subtype.startsWith("error"))) state.end("failed");
  else if (value.subtype === "success" && value.is_error !== true) state.end("completed");
  state.finalText(value.result);
}

function jsonlParser(provider: HarnessProvider, protocol: HarnessProtocol,
  consume: (state: ResultState, value: unknown) => void): NativeParser {
  const state = new ResultState(provider, protocol);
  let decoder = new TextDecoder("utf-8", { fatal: true });
  let pending = "";
  let pendingBytes = 0;
  let discarding = false;
  let finished = false;
  const line = (text: string) => {
    if (!text.trim()) return;
    try { consume(state, JSON.parse(text)); }
    catch { state.warn("Native JSONL contains malformed JSON.", true); }
  };
  const decoded = (text: string) => {
    const parts = text.split("\n");
    for (const [index, part] of parts.entries()) {
      const newline = index < parts.length - 1;
      if (!discarding) {
        pendingBytes += Buffer.byteLength(part, "utf8");
        if (pendingBytes > NATIVE_LINE_MAX_BYTES) {
          state.warn("Native JSONL line exceeded 262144 bytes and was discarded.", true);
          discarding = true; pending = ""; pendingBytes = 0;
        } else pending += part;
      }
      if (newline) {
        if (!discarding) line(pending);
        pending = ""; pendingBytes = 0; discarding = false;
      }
    }
  };
  return {
    write(chunk) {
      if (finished) return;
      try { decoded(decoder.decode(chunk, { stream: true })); }
      catch {
        state.warn("Native output contains invalid UTF-8.", true);
        pending = ""; pendingBytes = 0; discarding = true;
        decoder = new TextDecoder("utf-8", { fatal: true });
      }
    },
    finish() {
      if (!finished) {
        finished = true;
        try { decoded(decoder.decode()); } catch { state.warn("Native output ends with incomplete UTF-8.", true); }
        if (!discarding) line(pending);
        pending = "";
      }
      return state.result();
    },
  };
}

export function createCodexJsonlParser(): NativeParser { return jsonlParser("codex", "codex-jsonl", consumeCodex); }
export function createClaudeStreamParser(): NativeParser { return jsonlParser("claude", "claude-stream-json", consumeClaude); }
export function createClaudeJsonParser(): NativeParser {
  const state = new ResultState("claude", "claude-json");
  let chunks: Buffer[] = [];
  let bytes = 0;
  let finished = false;
  return {
    write(chunk) {
      if (finished) return;
      bytes += chunk.byteLength;
      if (bytes <= NATIVE_JSON_MAX_BYTES) chunks.push(Buffer.from(chunk)); else chunks = [];
    },
    finish() {
      if (!finished) {
        finished = true;
        if (bytes > NATIVE_JSON_MAX_BYTES) state.warn("Claude JSON exceeded 1048576 bytes; the result is incomplete.", true);
        else {
          try { consumeClaude(state, JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)))); }
          catch { state.warn("Claude JSON is malformed or contains invalid UTF-8.", true); }
        }
        chunks = [];
      }
      return state.result();
    },
  };
}
export function createNativeParser(protocol: HarnessProtocol): NativeParser {
  return protocol === "codex-jsonl" ? createCodexJsonlParser() : protocol === "claude-json" ? createClaudeJsonParser() : createClaudeStreamParser();
}
