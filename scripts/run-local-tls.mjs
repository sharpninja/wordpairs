// Loopback-only TLS entry point for the disposable real UI integration harness.
import { readFileSync } from "node:fs";
import { createServer } from "node:https";
import { request as upstreamRequest } from "node:http";

const [certPath, keyPath, listenValue, upstreamValue] = process.argv.slice(2);
const port = Number(listenValue);
const upstreamPort = Number(upstreamValue);
if (![port, upstreamPort].every((n) => Number.isInteger(n) && n > 1024 && n < 65536))
  throw new Error("Explicit unprivileged loopback ports are required");
const sockets = new Set();
const options = (request) => ({
  hostname: "127.0.0.1", port: upstreamPort, method: request.method,
  path: request.url, headers: { ...request.headers, "x-forwarded-proto": "https" },
});
const server = createServer({ cert: readFileSync(certPath), key: readFileSync(keyPath) }, (request, response) => {
  const upstream = upstreamRequest(options(request), (reply) => {
    response.writeHead(reply.statusCode ?? 502, reply.headers);
    reply.on("error", () => response.destroy());
    reply.on("aborted", () => response.destroy());
    reply.pipe(response);
  });
  upstream.on("error", () => { if (!response.headersSent) response.writeHead(502); response.end(); });
  request.on("aborted", () => upstream.destroy());
  response.on("close", () => { if (!response.writableFinished) upstream.destroy(); });
  request.pipe(upstream);
});
server.on("connection", (socket) => { sockets.add(socket); socket.on("close", () => sockets.delete(socket)); });
server.on("upgrade", (request, socket, head) => {
  const upstream = upstreamRequest(options(request));
  upstream.on("upgrade", (reply, transport, transportHead) => {
    sockets.add(transport); transport.on("close", () => sockets.delete(transport));
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n${reply.rawHeaders.reduce((lines, value, i, values) => i % 2 === 0 ? `${lines}${value}: ${values[i + 1]}\r\n` : lines, "")}\r\n`);
    if (head.length) transport.write(head);
    if (transportHead.length) socket.write(transportHead);
    socket.pipe(transport).pipe(socket);
    socket.on("error", () => transport.destroy());
    transport.on("error", () => socket.destroy());
    socket.on("close", () => transport.destroy());
    transport.on("close", () => socket.destroy());
  });
  upstream.on("response", (reply) => { socket.end(`HTTP/1.1 ${reply.statusCode} Error\r\nConnection: close\r\n\r\n`); reply.resume(); });
  upstream.on("error", () => socket.destroy());
  upstream.end();
});
function stop() { for (const socket of sockets) socket.destroy(); server.close(() => process.exit(0)); }
process.on("SIGTERM", stop); process.on("SIGINT", stop);
server.listen(port, "127.0.0.1", () => console.log(`Private UI TLS ready on127.0.0.1:${port}`));
