import { realpathSync } from 'node:fs';
import { createServer } from 'node:http';
import { isIP } from 'node:net';
import { pathToFileURL } from 'node:url';

export function normalizeHost(value) {
  if (typeof value !== 'string' || !value || value.trim() !== value || /[\s/@?#\\%]/.test(value)) throw new Error('`ui --host` must be a hostname or IP literal.');
  const bracketed = value.startsWith('[') || value.endsWith(']');
  const host = bracketed ? value.slice(1, -1) : value;
  if (bracketed && (!value.startsWith('[') || !value.endsWith(']') || isIP(host) !== 6)) throw new Error('`ui --host` brackets must enclose an IPv6 literal.');
  if (!isIP(host) && (!/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(host) || host.split('.').some(label => !label || label.length > 63 || label.startsWith('-') || label.endsWith('-')))) throw new Error('`ui --host` must be a hostname or IP literal.');
  try {
    const canonical = new URL(`http://${isIP(host) === 6 ? `[${host}]` : host}`).hostname;
    return canonical.startsWith('[') ? canonical.slice(1, -1) : canonical;
  } catch { throw new Error('`ui --host` must be a valid hostname or IP literal.'); }
}
export function advertisedOrigin(host, port) {
  const advertised = host === '0.0.0.0' ? '127.0.0.1' : host === '::' ? '::1' : host;
  return `http://${isIP(advertised) === 6 ? `[${advertised}]` : advertised}:${port}`;
}
function authorityKey(authority) {
  if (typeof authority !== 'string' || /[\s/@?#\\%]/.test(authority)) throw new Error('Malformed Host');
  const match = /^(\[[^\]]+\]|[^:]+)(?::(\d+))?$/.exec(authority);
  const port = match?.[2] ?? '80';
  if (!match || !/^[1-9]\d*$/.test(port) || Number(port) > 65535) throw new Error('Malformed Host');
  return `${normalizeHost(match[1])}|${port}`;
}
export function validHostHeader(rawHeaders, origin) {
  // Node's normalized header map may discard duplicates; inspect the original fields.
  const values = [];
  for (let index = 0; index < rawHeaders.length; index += 2) if (rawHeaders[index].toLowerCase() === 'host') values.push(rawHeaders[index + 1]);
  if (values.length !== 1) return 400;
  try { return authorityKey(values[0]) === authorityKey(origin.slice(7)) ? 0 : 421; }
  catch { return 400; }
}
export async function startServer(config) {
  const host = normalizeHost(config.host);
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error('Invalid UI port.');
  let handler;
  let origin;
  let stopping = false;
  let exitCode = 0;
  let shutdownTimer;
  const server = createServer((request, response) => {
    const invalid = validHostHeader(request.rawHeaders, origin ?? advertisedOrigin(host, config.port));
    if (invalid) { response.writeHead(invalid); response.end('Invalid Host authority'); return; }
    if (!handler || stopping) { response.writeHead(503); response.end('UI is starting or stopping'); return; }
    handler(request, response);
  });
  function finish() {
    clearTimeout(shutdownTimer);
    // This is a dedicated child: pending import/application timers must not outlive
    // the closed listener or the drain deadline. Flush IPC before relinquishing it.
    if (process.connected) {
      process.once('disconnect', () => process.exit(exitCode));
      process.disconnect();
    } else process.exit(exitCode);
  }
  function shutdown(code = 0) {
    exitCode = Math.max(exitCode, code);
    if (stopping) return;
    stopping = true;
    server.close(finish);
    server.closeIdleConnections();
    shutdownTimer = setTimeout(() => { server.closeAllConnections(); finish(); }, 30_000);
    shutdownTimer.unref();
  }
  process.on('SIGINT', () => shutdown());
  process.on('SIGTERM', () => shutdown());
  process.on('disconnect', () => shutdown());
  try {
    let bound = false;
    for (let port = config.port; port <= Math.min(config.port + 25, 65535); port++) {
      if (stopping) return;
      try {
        await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, () => { server.removeListener('error', reject); resolve(); }); });
        origin = advertisedOrigin(host, port); bound = true; break;
      } catch (error) { if (error.code !== 'EADDRINUSE') throw error; }
    }
    if (!bound) throw new Error(`No available UI port between ${config.port} and ${Math.min(config.port + 25, 65535)}.`);
    if (stopping) return;
    process.env.SPM_SERVER_ORIGIN = origin;
    process.env.SPM_SERVER_BODY_SIZE_LIMIT = 'Infinity';
    handler = (await import('../build/handler.js')).handler;
    if (stopping) return;
    process.send?.({ type: 'spm-ui-ready', host, port: server.address().port, origin, buildId: config.buildId, version: config.version });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`UI startup failed: ${message}`);
    process.send?.({ type: 'spm-ui-error', message });
    shutdown(1);
  }
  return { server, shutdown };
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try { await startServer(JSON.parse(process.env.SPM_UI_CONFIG)); }
  catch (error) { console.error(`UI startup failed: ${error.message}`); process.exitCode = 1; if (process.connected) process.disconnect(); }
}
