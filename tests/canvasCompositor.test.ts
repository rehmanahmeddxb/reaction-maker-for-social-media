import { test } from 'node:test';
import assert from 'node:assert/strict';

import { installFakeDom, makeVideo } from './domStub';

installFakeDom();

const { renderReactionFrame, getSourceRegionRect, calculatePipRect, getCanvasDimensions } =
  await import('../src/utils/canvasCompositor');

type Call = { op: string; args: any[] };

/** Records every 2D call so we can assert on what the compositor painted. */
function recordingCtx(width = 1920, height = 1080) {
  const calls: Call[] = [];
  const rec =
    (op: string) =>
    (...args: any[]) => {
      calls.push({ op, args });
      if (op === 'measureText') return { width: String(args[0]).length * 10 };
      return undefined;
    };

  const ctx: any = {
    canvas: { width, height },
    calls,
    filter: 'none',
    save: rec('save'),
    restore: rec('restore'),
    beginPath: rec('beginPath'),
    closePath: rec('closePath'),
    rect: rec('rect'),
    roundRect: rec('roundRect'),
    arc: rec('arc'),
    ellipse: rec('ellipse'),
    fill: rec('fill'),
    stroke: rec('stroke'),
    clip: rec('clip'),
    fillRect: rec('fillRect'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    translate: rec('translate'),
    scale: rec('scale'),
    rotate: rec('rotate'),
    drawImage: rec('drawImage'),
    fillText: rec('fillText'),
    measureText: rec('measureText'),
    createLinearGradient: () => ({ addColorStop() {} }),
  };
  return ctx;
}

function baseSettings(overrides: any = {}) {
  return {
    mainFeed: 'camera',
    layout: 'pip-bottom-right',
    cameraShape: 'rectangle',
    pipRectRatio: '16:9',
    pipCornerRadius: 8,
    aspectRatio: '16:9',
    pipSizePercent: 32,
    pipCustomX: 96,
    pipCustomY: 96,
    isCustomPipPosition: false,
    pipBorderColor: '#f43f5e',
    pipBorderWidth: 4,
    pipGlow: true,
    pipShadow: true,
    mirrorCamera: true,
    cameraFacingMode: 'user',
    flashlightMode: 'off',
    frontFlashBrightness: 0.95,
    frontFlashTone: 'daylight',
    sourceVolume: 0.8,
    micVolume: 1,
    sfxVolume: 0.8,
    overlayTitle: '',
    showWatermark: false,
    watermarkText: '',
    showTimerBadgeOnCanvas: false,
    filter: 'none',
    autoTranscribe: false,
    transcriptionPrimaryLang: 'en-US',
    transcriptionSecondaryLang: null,
    transcriptionBilingual: false,
    autoHideVideoOnPause: true,
    ...overrides,
  } as any;
}

function fakePoster() {
  const img: any = { complete: true, naturalWidth: 640, naturalHeight: 360, width: 640, height: 360 };
  Object.setPrototypeOf(img, (globalThis as any).HTMLImageElement.prototype);
  return img;
}

function render(opts: any = {}) {
  const ctx = recordingCtx();
  renderReactionFrame({
    ctx,
    sourceVideo: null,
    cameraVideo: null,
    fallbackAvatarCanvas: null,
    sourcePoster: null,
    settings: baseSettings(opts.settings),
    floatingReactions: [],
    ...opts,
  });
  return ctx;
}

const drawnImages = (ctx: any) => ctx.calls.filter((c: Call) => c.op === 'drawImage').map((c: Call) => c.args[0]);
const texts = (ctx: any) => ctx.calls.filter((c: Call) => c.op === 'fillText').map((c: Call) => String(c.args[0]));

test('a decoded source video is painted (not swapped for the poster)', () => {
  const video = makeVideo({ pixel: [100, 100, 100] });
  const poster = fakePoster();
  const ctx = render({ sourceVideo: video, sourcePoster: poster });

  assert.ok(drawnImages(ctx).includes(video), 'the live video must be drawn');
  assert.ok(!drawnImages(ctx).includes(poster), 'the poster must not shadow a working video');
  assert.equal(
    texts(ctx).some((t) => /Thumbnail only/.test(t)),
    false,
    'no warning badge when the video is really painting'
  );
});

test('REGRESSION: a poster stand-in is labelled instead of silently faking a preview', () => {
  // The old build swapped in the poster with no indication. Sample clips
  // showed a pretty Unsplash still, users assumed playback worked, and the
  // export came out black because the <video> had never decoded.
  const stalled = makeVideo({ readyState: 1 });
  const poster = fakePoster();
  const ctx = render({ sourceVideo: stalled, sourcePoster: poster });

  assert.ok(drawnImages(ctx).includes(poster), 'poster is used as a stand-in');
  assert.ok(
    texts(ctx).some((t) => /Thumbnail only/i.test(t)),
    'the stand-in must be labelled on the canvas'
  );
});

test('the status badge shows the supplied decode reason', () => {
  const stalled = makeVideo({ readyState: 1 });
  const ctx = render({
    sourceVideo: stalled,
    sourcePoster: fakePoster(),
    sourceStatusText: 'Buffering first frame',
  });
  assert.ok(texts(ctx).some((t) => /Buffering first frame/.test(t)));
});

test('no video and no poster renders an explicit prompt plus a badge', () => {
  const ctx = render({});
  const all = texts(ctx).join(' | ');
  assert.match(all, /Click to Add Video/);
  assert.match(all, /No video frame/);
});

test('a hidden (paused) source is not badged as broken', () => {
  const ctx = render({ sourceVideo: makeVideo({ readyState: 1 }), sourcePoster: fakePoster(), isSourceVideoHidden: true });
  assert.equal(texts(ctx).some((t) => /Thumbnail only/i.test(t)), false);
});

test('camera falls back to the avatar canvas when it has no frame', () => {
  const avatar: any = { width: 640, height: 360 };
  Object.setPrototypeOf(avatar, (globalThis as any).HTMLCanvasElement.prototype);
  const ctx = render({ cameraVideo: makeVideo({ readyState: 0 }), fallbackAvatarCanvas: avatar });
  assert.ok(drawnImages(ctx).includes(avatar));
});

test('getSourceRegionRect follows the source feed across every layout', () => {
  const { width: W, height: H } = getCanvasDimensions('16:9');

  // Camera is the main feed → the clip lives in the PiP box.
  const pip = getSourceRegionRect(baseSettings({ mainFeed: 'camera' }), W, H);
  assert.deepEqual(pip, calculatePipRect(baseSettings({ mainFeed: 'camera' }), W, H));

  // Clip is the main feed → the clip owns the whole canvas.
  assert.deepEqual(getSourceRegionRect(baseSettings({ mainFeed: 'video' }), W, H), {
    x: 0,
    y: 0,
    width: W,
    height: H,
  });

  assert.deepEqual(
    getSourceRegionRect(baseSettings({ layout: 'split-side-by-side', mainFeed: 'camera' }), W, H),
    { x: W / 2, y: 0, width: W / 2, height: H }
  );
  assert.deepEqual(
    getSourceRegionRect(baseSettings({ layout: 'split-top-bottom', mainFeed: 'camera' }), W, H),
    { x: 0, y: H / 2, width: W, height: H / 2 }
  );
  assert.deepEqual(
    getSourceRegionRect(baseSettings({ layout: 'stacked-shorts', mainFeed: 'video' }), W, H),
    { x: 0, y: 0, width: W, height: H * 0.48 }
  );
});

test('the PiP box always stays inside the canvas', () => {
  for (const aspect of ['16:9', '9:16', '1:1'] as const) {
    const { width: W, height: H } = getCanvasDimensions(aspect);
    for (const size of [15, 32, 65, 200]) {
      for (const [cx, cy] of [[0, 0], [50, 50], [100, 100], [-20, 130]]) {
        const rect = calculatePipRect(
          baseSettings({ pipSizePercent: size, isCustomPipPosition: true, pipCustomX: cx, pipCustomY: cy }),
          W,
          H
        );
        assert.ok(rect.x >= 0 && rect.y >= 0, `${aspect} ${size} ${cx},${cy}`);
        assert.ok(rect.x + rect.width <= W + 0.001);
        assert.ok(rect.y + rect.height <= H + 0.001);
      }
    }
  }
});
