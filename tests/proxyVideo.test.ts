/**
 * Integration test for /api/proxy-video.
 *
 * Without Range support the browser cannot seek a proxied clip, so
 * primeVideoFrame() can never move off a black leader frame — and it had to
 * download the entire file (the old samples were 150-180 MB) before showing
 * anything. These tests run the real express handler against a local origin.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';

// The payload our fake CDN serves.
const PAYLOAD = Buffer.alloc(64 * 1024);
for (let i = 0; i < PAYLOAD.length; i++) PAYLOAD[i] = i % 251;

let originServer: http.Server;
let proxyServer: http.Server;
let originUrl = '';
let proxyPort = 0;

/** A minimal Range-capable static origin, like commondatastorage.googleapis.com. */
function createOrigin(): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d+)-(\d*)/.exec(range);
      const start = m ? Number(m[1]) : 0;
      const end = m && m[2] ? Number(m[2]) : PAYLOAD.length - 1;
      const chunk = PAYLOAD.subarray(start, end + 1);
      res.writeHead(206, {
        'Content-Type': 'video/mp4',
        'Content-Length': String(chunk.length),
        'Content-Range': `bytes ${start}-${end}/${PAYLOAD.length}`,
        'Accept-Ranges': 'bytes',
      });
      res.end(chunk);
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': String(PAYLOAD.length),
      'Accept-Ranges': 'bytes',
    });
    res.end(PAYLOAD);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** Mount the exact handler server.ts registers for /api/proxy-video. */
async function createProxy(): Promise<http.Server> {
  const app = express();
  // Import the handler body by re-declaring the route from server.ts source.
  const { proxyVideoHandler } = await import('../server/proxyVideoHandler');
  app.get('/api/proxy-video', proxyVideoHandler);
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

before(async () => {
  originServer = await createOrigin();
  const oa = originServer.address() as any;
  originUrl = `http://127.0.0.1:${oa.port}/clip.mp4`;

  proxyServer = await createProxy();
  proxyPort = (proxyServer.address() as any).port;
});

after(async () => {
  await new Promise((r) => originServer.close(() => r(null)));
  await new Promise((r) => proxyServer.close(() => r(null)));
});

const proxied = (extra: RequestInit = {}) =>
  fetch(`http://127.0.0.1:${proxyPort}/api/proxy-video?url=${encodeURIComponent(originUrl)}`, extra);

test('rejects non-http URLs', async () => {
  const res = await fetch(
    `http://127.0.0.1:${proxyPort}/api/proxy-video?url=${encodeURIComponent('file:///etc/passwd')}`
  );
  assert.equal(res.status, 400);
});

test('streams the whole file and reports its length', async () => {
  const res = await proxied();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'video/mp4');
  assert.equal(res.headers.get('content-length'), String(PAYLOAD.length));
  const body = Buffer.from(await res.arrayBuffer());
  assert.equal(body.length, PAYLOAD.length);
  assert.ok(body.equals(PAYLOAD));
});

test('REGRESSION: advertises Accept-Ranges so <video> knows it can seek', async () => {
  const res = await proxied();
  assert.equal(res.headers.get('accept-ranges'), 'bytes');
  await res.arrayBuffer();
});

test('REGRESSION: forwards Range requests and answers 206 with Content-Range', async () => {
  const res = await proxied({ headers: { Range: 'bytes=1024-2047' } });
  assert.equal(res.status, 206);
  assert.equal(res.headers.get('content-range'), `bytes 1024-2047/${PAYLOAD.length}`);
  const body = Buffer.from(await res.arrayBuffer());
  assert.equal(body.length, 1024);
  assert.ok(body.equals(PAYLOAD.subarray(1024, 2048)));
});

test('an open-ended Range (what Chrome sends first) works', async () => {
  const res = await proxied({ headers: { Range: 'bytes=0-' } });
  assert.equal(res.status, 206);
  const body = Buffer.from(await res.arrayBuffer());
  assert.equal(body.length, PAYLOAD.length);
});

test('upstream failures are passed through, not turned into a hang', async () => {
  const res = await fetch(
    `http://127.0.0.1:${proxyPort}/api/proxy-video?url=${encodeURIComponent(
      'http://127.0.0.1:1/nope.mp4'
    )}`
  );
  assert.equal(res.status, 500);
});
