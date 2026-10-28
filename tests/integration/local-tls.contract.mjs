import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { request } from "node:https";
import { once } from "node:events";

test("loopback TLS proxy survives an upstream response reset after headers", { timeout: 20000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), "wp-tls-contract-"));
  const cert = join(directory, "cert.pem"), key = join(directory, "key.pem");
  let child;
  const upstream = createServer((incoming, response) => {
    if (incoming.url === "/abort") {
      response.writeHead(200, { "content-length": "100" }); response.write("partial");
      setTimeout(() => response.destroy(), 10);
    } else response.end("healthy");
  });
  const reservation = createServer();
  try {
    execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key,
      "-out", cert, "-days", "1", "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1"], { stdio: "ignore" });
    upstream.listen(0, "127.0.0.1"); await once(upstream, "listening");
    reservation.listen(0, "127.0.0.1"); await once(reservation, "listening");
    const port = reservation.address().port;
    await new Promise((resolve) => reservation.close(resolve));
    child = spawn(process.execPath, ["scripts/run-local-tls.mjs", cert, key, String(port), String(upstream.address().port)], { stdio: ["ignore", "pipe", "pipe"] });
    await Promise.race([once(child.stdout, "data"), once(child, "exit").then(() => { throw new Error("Proxy startup failed"); })]);
    const get = (path) => new Promise((resolve, reject) => {
      const req = request({ hostname: "127.0.0.1", port, path, rejectUnauthorized: false }, (reply) => {
        let data = ""; reply.on("data", (chunk) => { data += chunk; });
        reply.on("end", () => resolve(data)); reply.on("error", reject);
        reply.on("aborted", () => reject(new Error("response aborted")));
      });
      req.setTimeout(2000, () => req.destroy(new Error("Request timed out")));
      req.on("error", reject); req.end();
    });
    await assert.rejects(get("/abort"));
    assert.equal(await get("/healthy"), "healthy");
    assert.equal(child.exitCode, null);
  } finally {
    if (child && child.exitCode === null) { child.kill("SIGTERM"); await once(child, "exit"); }
    upstream.closeAllConnections(); await new Promise((resolve) => upstream.close(resolve));
    reservation.close(); rmSync(directory, { recursive: true, force: true });
  }
});
