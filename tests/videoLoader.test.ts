import { test } from 'node:test';
import assert from 'node:assert/strict';

import { installFakeDom, makeVideo } from './domStub';

installFakeDom();

const {
  analyzeFramePixels,
  probeVideoFrame,
  captureVideoThumbnail,
  isVideoDrawable,
  describeVideoState,
  guessVideoMime,
} = await import('../src/utils/videoLoader');

function rgbaBuffer(triplets: Array<[number, number, number]>) {
  const data = new Uint8ClampedArray(triplets.length * 4);
  triplets.forEach(([r, g, b], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  });
  return data;
}

test('analyzeFramePixels: a fully black frame is not visible', () => {
  const res = analyzeFramePixels(rgbaBuffer(Array(64).fill([0, 0, 0])));
  assert.equal(res.visible, false);
  assert.equal(res.luma, 0);
  assert.equal(res.spread, 0);
});

test('analyzeFramePixels: near-black compression noise is still not visible', () => {
  const res = analyzeFramePixels(rgbaBuffer(Array(64).fill([2, 2, 2])));
  assert.equal(res.visible, false);
});

test('analyzeFramePixels: a normal frame is visible', () => {
  const res = analyzeFramePixels(rgbaBuffer(Array(64).fill([120, 130, 110])));
  assert.equal(res.visible, true);
  assert.ok(res.luma > 100);
});

test('analyzeFramePixels: a dark night scene with highlights counts as visible', () => {
  const pixels: Array<[number, number, number]> = Array(64).fill([1, 1, 1]);
  pixels[0] = [60, 60, 60];
  pixels[1] = [80, 80, 80];
  const res = analyzeFramePixels(rgbaBuffer(pixels));
  assert.equal(res.visible, true, 'contrast should rescue a dark-but-real frame');
});

test('isVideoDrawable rejects metadata-only and zero-size videos', () => {
  assert.equal(isVideoDrawable(makeVideo({ readyState: 1 })), false);
  assert.equal(isVideoDrawable(makeVideo({ width: 0, height: 0 })), false);
  assert.equal(isVideoDrawable(makeVideo({ readyState: 2 })), true);
  assert.equal(isVideoDrawable(null), false);
});

test('probeVideoFrame reports a black decoded frame as drawn-but-not-visible', () => {
  const probe = probeVideoFrame(makeVideo({ pixel: [0, 0, 0] }));
  assert.equal(probe.drawn, true);
  assert.equal(probe.visible, false);
});

test('probeVideoFrame reports a real frame as visible', () => {
  const probe = probeVideoFrame(makeVideo({ pixel: [90, 100, 110] }));
  assert.equal(probe.drawn, true);
  assert.equal(probe.visible, true);
});

test('probeVideoFrame surfaces a drawImage failure instead of pretending it worked', () => {
  const probe = probeVideoFrame(makeVideo({ throwOnDraw: true }));
  assert.equal(probe.drawn, false);
  assert.match(probe.error || '', /decode failure/);
});

test('probeVideoFrame treats a tainted canvas as painting but flags it', () => {
  const probe = probeVideoFrame(makeVideo({ tainted: true }));
  assert.equal(probe.drawn, true);
  assert.equal(probe.visible, true);
  assert.equal(probe.error, 'tainted');
});

test('REGRESSION: captureVideoThumbnail refuses to produce an all-black poster', () => {
  // This is the bug that made the studio look like it was working: a black
  // poster was installed and painted onto the canvas, so the user saw a black
  // rectangle in the preview and a black export, with no error anywhere.
  assert.equal(captureVideoThumbnail(makeVideo({ pixel: [0, 0, 0] })), '');
});

test('captureVideoThumbnail returns a poster for a real frame', () => {
  const url = captureVideoThumbnail(makeVideo({ pixel: [140, 140, 140] }));
  assert.match(url, /^data:image\/jpeg/);
});

test('captureVideoThumbnail can be forced to accept a dark frame', () => {
  const url = captureVideoThumbnail(makeVideo({ pixel: [0, 0, 0] }), true);
  assert.match(url, /^data:image\/jpeg/);
});

test('captureVideoThumbnail returns empty for a video with no dimensions', () => {
  assert.equal(captureVideoThumbnail(makeVideo({ width: 0, height: 0 })), '');
});

test('describeVideoState explains each failure mode in plain language', () => {
  assert.match(describeVideoState(makeVideo({ error: { code: 4 } })), /not supported/i);
  assert.match(describeVideoState(makeVideo({ error: { code: 3 } })), /codec/i);
  assert.match(describeVideoState(makeVideo({ readyState: 0 })), /metadata/i);
  assert.match(describeVideoState(makeVideo({ width: 0, height: 0 })), /no video track/i);
  assert.match(describeVideoState(makeVideo({ readyState: 1 })), /Buffering/i);
  assert.match(
    describeVideoState(makeVideo({}), { drawn: true, luma: 0, spread: 0, visible: false }),
    /black/i
  );
  assert.equal(
    describeVideoState(makeVideo({}), { drawn: true, luma: 90, spread: 40, visible: true }),
    'Painting'
  );
});

test('guessVideoMime never returns an empty type for phone pickers', () => {
  assert.equal(guessVideoMime('clip.MOV', ''), 'video/quicktime');
  assert.equal(guessVideoMime('clip.mkv'), 'video/x-matroska');
  assert.equal(guessVideoMime('clip.webm'), 'video/webm');
  assert.equal(guessVideoMime('weird-name-no-ext'), 'video/mp4');
  assert.equal(guessVideoMime('clip.mp4', 'video/mp4'), 'video/mp4');
});

/* --------------------------------------------------------------------------
 * primeVideoFrame — the "my clip is just a black rectangle" path.
 * ------------------------------------------------------------------------ */

const { primeVideoFrame, seekTo } = await import('../src/utils/videoLoader');

/** A video whose frames only become non-black after `visibleFrom` seconds. */
function videoBlackUntil(visibleFrom: number, duration = 20) {
  const holder: { v: any } = { v: null };
  const v: any = makeVideo({
    duration,
    pixel: () => (holder.v.currentTime >= visibleFrom ? [130, 120, 110] : [0, 0, 0]),
  });
  v.duration = duration;
  holder.v = v;
  return v;
}

test('primeVideoFrame keeps the first frame when it is already visible', async () => {
  const v: any = makeVideo({ pixel: [90, 90, 90] });
  const probe = await primeVideoFrame(v, 'seek');
  assert.equal(probe.visible, true);
  assert.equal(v.seeks.length, 0, 'no pointless seeking when frame 1 is fine');
});

test('REGRESSION: primeVideoFrame seeks past a black lead-in instead of giving up', async () => {
  // Loads of real clips (phone recordings, anything with a fade-in) start on
  // pure black. The old code seeked to ~0.08s once and shipped that frame as
  // the poster, so the studio showed a black box and "looked broken".
  const v: any = videoBlackUntil(2.5, 20);
  const probe = await primeVideoFrame(v, 'seek');
  assert.equal(probe.visible, true, 'must land on a frame you can actually see');
  assert.ok(v.seeks.length > 1, 'must escalate through several timestamps');
  assert.ok(v.currentTime >= 2.5, `ended on ${v.currentTime}`);
});

test('primeVideoFrame gives up gracefully on an entirely black clip', async () => {
  const v: any = videoBlackUntil(Infinity, 8);
  const probe = await primeVideoFrame(v, 'seek');
  assert.equal(probe.drawn, true);
  assert.equal(probe.visible, false, 'reported honestly rather than pretending');
});

test('primeVideoFrame is safe on an element with no source', async () => {
  const v: any = makeVideo({ src: '' });
  v.src = '';
  const probe = await primeVideoFrame(v, 'seek');
  assert.equal(probe.drawn, false);
});

test('seekTo ignores non-finite targets (NaN duration on streaming files)', async () => {
  const v: any = makeVideo({});
  await seekTo(v, NaN);
  assert.equal(v.seeks.length, 0);
});
