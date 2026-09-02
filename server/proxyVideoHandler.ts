import type { Request, Response } from 'express';

/**
 * CORS-safe video proxy.
 *
 * Two things matter for the studio:
 *   1. Same-origin delivery, so the canvas that composites the clip is never
 *      tainted (a tainted canvas makes captureStream() throw and the export
 *      dies / comes out black).
 *   2. HTTP Range support. Without it the browser cannot seek, which means the
 *      "find a non-black frame" priming pass has nothing to work with, and it
 *      has to buffer the entire file before painting anything.
 */
export async function proxyVideoHandler(req: Request, res: Response) {
  const targetUrl = req.query.url as string;
  if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
    return res.status(400).send('Valid http/https URL required');
  }

  try {
    const forwardHeaders: Record<string, string> = {};
    const range = req.headers.range;
    if (typeof range === 'string') forwardHeaders.Range = range;

    const upstreamRes = await fetch(targetUrl, { headers: forwardHeaders });
    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return res.status(upstreamRes.status).send('Failed to fetch upstream media');
    }

    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'video/mp4');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    res.status(upstreamRes.status === 206 ? 206 : 200);

    if (!upstreamRes.body) {
      res.end();
      return;
    }

    // Iterative pump that respects backpressure. The previous implementation
    // recursed once per chunk, which both ignored backpressure and blew the
    // stack on large files.
    const reader = upstreamRes.body.getReader();
    let clientGone = false;
    res.on('close', () => {
      clientGone = true;
      reader.cancel().catch(() => undefined);
    });

    while (!clientGone) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(Buffer.from(value))) {
        await new Promise<void>((resolve) => res.once('drain', () => resolve()));
      }
    }
    res.end();
  } catch (err: any) {
    console.warn('Proxy video error:', err?.message || err);
    if (!res.headersSent) res.status(500).send('Error proxying media');
    else res.end();
  }
}
