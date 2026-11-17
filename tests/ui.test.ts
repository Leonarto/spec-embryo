import { describe, expect, test } from "bun:test";
import type { ParsedArgs } from "../src/cli.ts";
import { productionUiEnvironment, resolveNodeRuntime, resolveUiLaunchConfig, supportedNodeVersion } from "../src/services/ui.ts";
import { advertisedOrigin, normalizeHost, validHostHeader } from "../web/runtime/server.mjs";
const parsed = (flags: Record<string, string | boolean> = {}): ParsedArgs => ({ command: "ui", subcommand: undefined, positionals: ["ui"], flags: new Map(Object.entries(flags)) });
describe("UI launch contract", () => {
  test("production defers binding to child, DEV probes only the bounded legal range", async () => {
    let probes = 0;
    expect((await resolveUiLaunchConfig(process.cwd(), parsed(), { portProbe: async () => { probes++; return false; } })).port).toBe(4173);
    expect(probes).toBe(0);
    const config = await resolveUiLaunchConfig(process.cwd(), parsed({ dev: true, port: "65534" }), { portProbe: async (_host, port) => { probes++; return port === 65535; } });
    expect(config.port).toBe(65535); expect(probes).toBe(2);
    await expect(resolveUiLaunchConfig(process.cwd(), parsed({ dev: true, port: "65535" }), { portProbe: async () => false })).rejects.toThrow("65535 and 65535");
  });
  test("rejects incomplete flags, partial ports and boolean values", async () => {
    for (const port of [true, "", "0", "65536", "12x", "1.5", "-1", " 12"]) await expect(resolveUiLaunchConfig(process.cwd(), parsed({ port }))).rejects.toThrow();
    for (const host of [true, "", "http://localhost", "user@localhost", "a/b", "x:40", "a..b", "-host", "[localhost]", "[127.0.0.1]", "[::1", "::1]"]) await expect(resolveUiLaunchConfig(process.cwd(), parsed({ host }))).rejects.toThrow();
    await expect(resolveUiLaunchConfig(process.cwd(), parsed({ dev: "true" }))).rejects.toThrow("boolean");
  });
  test("normalizes exactly one advertised authority, including IPv6", () => {
    expect(normalizeHost("LOCALHOST")).toBe("localhost");
    for (const host of ["127.1", "2130706433", "0x7f000001"]) {
      expect(normalizeHost(host)).toBe("127.0.0.1");
      expect(advertisedOrigin(normalizeHost(host), 4173)).toBe("http://127.0.0.1:4173");
      expect(validHostHeader(["Host", "127.0.0.1:4173"], advertisedOrigin(normalizeHost(host),4173))).toBe(0);
      expect(validHostHeader(["Host", "127.0.0.2:4173"], advertisedOrigin(normalizeHost(host),4173))).toBe(421);
    }
    expect(() => normalizeHost("999.999")).toThrow("valid hostname or IP literal");
    expect(advertisedOrigin("0.0.0.0", 4173)).toBe("http://127.0.0.1:4173");
    expect(advertisedOrigin("::", 4173)).toBe("http://[::1]:4173");
    expect(validHostHeader(["Host", "localhost:80"], "http://localhost:80")).toBe(0);
    expect(validHostHeader(["Host", "localhost"], "http://localhost:80")).toBe(0);
    expect(validHostHeader(["Host", "[::1]"], "http://[::1]:80")).toBe(0);
    expect(validHostHeader(["Host", "[::1]:80"], "http://[::1]:80")).toBe(0);
    expect(validHostHeader(["Host", "[::1]"], "http://[::1]:4173")).toBe(421);
    expect(validHostHeader(["Host", "localhost"], "http://localhost:4173")).toBe(421);
    expect(validHostHeader(["Host", "LOCALHOST:4173"], "http://localhost:4173")).toBe(0);
    expect(validHostHeader(["Host", "[0:0:0:0:0:0:0:1]:4173"], "http://[::1]:4173")).toBe(0);
    expect(validHostHeader(["Host", "evil.example:4173"], "http://localhost:4173")).toBe(421);
    for (const headers of [[], ["Host", "[localhost]:4173"], ["Host", "[127.0.0.1]:4173"], ["Host", "[::1:4173"], ["Host", "localhost]:4173"], ["Host", "localhost:04173"], ["Host", "localhost:4173", "HOST", "localhost:4173"], ["Host", "localhost:4173@evil"]]) expect(validHostHeader(headers, "http://localhost:4173")).toBe(400);
  });
  test("requires actual supported Node and scrubs binding/proxy inputs", async () => {
    for (const version of ["v22.12.0", "23.0.0", "v25.6.0"]) expect(supportedNodeVersion(version)).toBe(true);
    for (const version of ["v22.11.9", "v20.19.0", "banana", "v22.12.0-rc"]) expect(supportedNodeVersion(version)).toBe(false);
    await expect(resolveNodeRuntime("/nonexistent/spm-node")).rejects.toThrow("actual Node.js");
    const environment = productionUiEnvironment({ SPM_SERVER_ORIGIN: "evil", LISTEN_FDS: "3", ORIGIN: "evil", HOST: "evil", PORT: "4", HOST_HEADER: "x-forwarded-host", NODE_OPTIONS: "--require bad", SAFE: "yes" }, "/fixture");
    expect(environment).toEqual({ SAFE: "yes", NODE_ENV: "production", SPM_PROJECT_ROOT: "/fixture", SPM_SERVER_BODY_SIZE_LIMIT: "Infinity" });
  });
});
