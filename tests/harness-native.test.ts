import { describe, expect, test } from "bun:test";
import fixture from "./fixtures/harness/native-profile-v1.json";
import { createNativeParser, NATIVE_LINE_MAX_BYTES, validNativeSessionId } from "../src/services/harness-native.ts";
import type { HarnessProtocol } from "../src/domain.ts";

function parsed(protocol: HarnessProtocol, text: string | Buffer) {
  const parser = createNativeParser(protocol);
  const bytes = Buffer.isBuffer(text) ? text : Buffer.from(text);
  for (let start = 0; start < bytes.length; start += 7) parser.write(bytes.subarray(start, start + 7));
  return parser.finish();
}

describe("bounded native output parsers", () => {
  test("versioned synthetic fixtures normalize final response and exact IDs across Unicode splits", () => {
    expect(fixture.fixture_version).toBe(1); expect(fixture.synthetic).toBe(true);
    for (const protocol of ["codex-jsonl", "claude-json", "claude-stream-json"] as const) {
      const events = protocol === "codex-jsonl" ? fixture.codex.events : fixture.claude.events;
      const text = protocol === "claude-json" ? JSON.stringify(events.at(-1)) : events.map((event) => JSON.stringify(event)).join("\n");
      const result = parsed(protocol, text);
      expect(result.terminal).toBe("completed"); expect(result.session_id).toBe(protocol === "codex-jsonl" ? "session-codex-fixture" : "session-claude-fixture");
      expect(result.final_text).toBe("Observed final response 🌍"); expect(result.final_text_truncated).toBe(false);
      expect(result.warnings).toEqual([]);
    }
  });

  test("unknown records do not prove success and unknown fields are ignored", () => {
    expect(parsed("codex-jsonl", '{"type":"future.event","success":true}\n').terminal).toBe("unknown");
    const text = '{"type":"thread.started","thread_id":"opaque;$()","unknown":true}\n{"type":"future.event"}\n{"type":"turn.completed","future":"ignored"}';
    const result = parsed("codex-jsonl", text);
    expect(result.terminal).toBe("completed"); expect(result.session_id).toBe("opaque;$()");
    expect(result.final_text).toBeNull();
    expect(parsed("codex-jsonl", '{"type":"turn.completed"}\n{"type":"turn.started"}').terminal).toBe("unknown");
    expect(parsed("claude-stream-json", '{"type":"future.event","session_id":"not a valid identity"}\n{"type":"result","subtype":"success","is_error":false}').terminal).toBe("completed");
    expect(parsed("claude-json", '{"type":"result","subtype":"success","is_error":"false"}').terminal).toBe("unknown");
  });

  test("malformed, oversized, invalid UTF-8, conflicting IDs and terminal failures are sticky", () => {
    const completed = '{"type":"turn.completed"}\n';
    for (const prefix of ["garbage\n", '"' + "x".repeat(NATIVE_LINE_MAX_BYTES) + '"\n',
      '{"type":"thread.started","thread_id":"one"}\n{"type":"thread.started","thread_id":"two"}\n',
      '{"type":"turn.failed"}\n']) {
      const result = parsed("codex-jsonl", prefix + completed);
      expect(result.terminal).toBe("unknown"); expect(result.warnings.length).toBeGreaterThan(0);
    }
    expect(parsed("codex-jsonl", completed + "{partial").terminal).toBe("unknown");
    expect(parsed("codex-jsonl", Buffer.concat([Buffer.from(completed), Buffer.from([0xff]), Buffer.from("\n" + completed)]))).toMatchObject({ terminal: "unknown" });
    expect(parsed("codex-jsonl", Buffer.concat([Buffer.from(completed), Buffer.from([0xf0, 0x9f])]))).toMatchObject({ terminal: "unknown" });
    const contradictory = parsed("codex-jsonl", '{"type":"thread.started","thread_id":"one"}\n{"type":"thread.started","thread_id":"two"}');
    expect(contradictory.session_id).toBeNull();
    expect(parsed("claude-stream-json", '{"type":"result","subtype":"error_max_turns","is_error":true}\n').terminal).toBe("failed");
    expect(parsed("codex-jsonl", '{"type":"error","message":"not copied"}\n').terminal).toBe("failed");
  });

  test("session IDs reject invalid identities without echoing them or repairing whitespace", () => {
    for (const id of ["", "-option", "has space", "has\nnewline", "hidden\u200bcontrol", "x".repeat(513), null, 5]) {
      expect(validNativeSessionId(id)).toBe(false);
      const result = parsed("claude-json", JSON.stringify({ type: "result", subtype: "success", is_error: false, session_id: id }));
      expect(result.session_id).toBeNull(); expect(result.terminal).toBe("unknown");
      expect(result.warnings).toEqual(["Native session identity is invalid; it was not retained."]);
    }
    expect(validNativeSessionId("opaque:🦊;$()")).toBe(true);
    expect(parsed("claude-json", '{"type":"result","subtype":"success","is_error":false}').terminal).toBe("completed");
  });

  test("JSONL drains beyond the P0 cap and still observes a later terminal with bounded state", () => {
    const parser = createNativeParser("codex-jsonl");
    const ignored = Buffer.from(JSON.stringify({ type: "item.completed", item: { type: "reasoning", text: "PRIVATE_REASONING".repeat(5000) } }) + "\n");
    for (let index = 0; index < 20; index += 1) parser.write(ignored);
    parser.write(Buffer.from('{"type":"turn.completed"}'));
    const result = parser.finish();
    expect(result.terminal).toBe("completed"); expect(result.final_text).toBeNull();
    expect(JSON.stringify(result)).not.toContain("PRIVATE_REASONING");
  });

  test("final text is capped safely, warning arrays are bounded, and monolithic overflow is incomplete", () => {
    const text = "🌍".repeat(20000);
    const result = parsed("codex-jsonl", JSON.stringify({ type: "item.completed", item: { type: "agent_message", text } }) + '\n{"type":"turn.completed"}');
    expect(result.terminal).toBe("completed"); expect(result.final_text_truncated).toBe(true);
    expect(Buffer.byteLength(result.final_text!)).toBe(65536); expect(result.final_text).not.toContain("\uFFFD");
    const warnings = parsed("claude-stream-json", "garbage\n".repeat(50));
    expect(warnings.warnings).toHaveLength(32); expect(warnings.warnings_omitted).toBe(18);
    expect(warnings.warnings.every((warning) => Buffer.byteLength(warning) <= 256)).toBe(true);
    const overflow = parsed("claude-json", JSON.stringify({ type: "result", subtype: "success", result: "x".repeat(1048576) }));
    expect(overflow.terminal).toBe("unknown"); expect(overflow.final_text).toBeNull();
    expect(overflow.warnings.join(" ")).toContain("1048576");
  });
});
