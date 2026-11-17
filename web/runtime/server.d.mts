export function normalizeHost(value: unknown): string;
export function advertisedOrigin(host: string, port: number): string;
export function validHostHeader(rawHeaders: string[], origin: string): number;
export function startServer(config: { host: string; port: number; buildId: string; version: string }): Promise<{ server: import('node:http').Server; shutdown: (code?: number) => void } | undefined>;
