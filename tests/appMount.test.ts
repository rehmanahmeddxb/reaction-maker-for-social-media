/**
 * Mount smoke test for the studio.
 *
 * jsdom has no real media stack, so this cannot prove pixels are painted — but
 * it does prove the app mounts, the source <video> is created *visible* (the
 * regression that made mobile browsers withhold frames), and that a selected
 * clip is actually assigned to that element.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let dom: JSDOM;
let container: HTMLElement;
let root: any;

before(async () => {
  dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:3000/',
    pretendToBeVisual: true,
  });

  const g = globalThis as any;
  g.window = dom.window;
  g.document = dom.window.document;
  Object.defineProperty(g, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
    writable: true,
  });
  g.HTMLElement = dom.window.HTMLElement;
  g.HTMLVideoElement = dom.window.HTMLVideoElement;
  g.HTMLCanvasElement = dom.window.HTMLCanvasElement;
  g.HTMLImageElement = dom.window.HTMLImageElement;
  g.Image = dom.window.Image;
  g.Event = dom.window.Event;
  g.CustomEvent = dom.window.CustomEvent;
  g.getComputedStyle = dom.window.getComputedStyle;
  g.requestAnimationFrame = (cb: any) => setTimeout(() => cb(Date.now()), 16) as unknown as number;
  g.cancelAnimationFrame = (id: any) => clearTimeout(id);
  g.IS_REACT_ACT_ENVIRONMENT = true;
  g.URL.createObjectURL = () => 'blob:mock';
  g.URL.revokeObjectURL = () => undefined;

  // jsdom throws "Not implemented" for these; stub them out quietly.
  dom.window.HTMLMediaElement.prototype.play = function () {
    return Promise.resolve();
  };
  dom.window.HTMLMediaElement.prototype.pause = function () {};
  dom.window.HTMLMediaElement.prototype.load = function () {};
  // jsdom has no 2D rasteriser; hand back a no-op context so the real render
  // loop runs (and so a missing null-check would still surface as a crash).
  const noopCtx: any = new Proxy(
    {
      canvas: null,
      filter: 'none',
      fillStyle: '',
      strokeStyle: '',
      font: '',
      globalAlpha: 1,
      lineWidth: 1,
      textAlign: 'left',
      textBaseline: 'top',
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    },
    {
      get(target: any, prop: string) {
        if (prop in target) return target[prop];
        if (prop === 'measureText') return () => ({ width: 10 });
        if (prop === 'createRadialGradient' || prop === 'createLinearGradient')
          return () => ({ addColorStop() {} });
        if (prop === 'getImageData')
          return (_x: number, _y: number, w: number, h: number) => ({
            data: new Uint8ClampedArray(w * h * 4),
            width: w,
            height: h,
          });
        return () => undefined;
      },
      set(target: any, prop: string, value: any) {
        target[prop] = value;
        return true;
      },
    }
  );
  (dom.window.HTMLCanvasElement.prototype as any).getContext = function () {
    noopCtx.canvas = this;
    return noopCtx;
  };
  (dom.window.HTMLCanvasElement.prototype as any).toDataURL = () => 'data:image/jpeg;base64,X';
  (dom.window as any).AudioContext = undefined;
  Object.defineProperty(dom.window.navigator, 'mediaDevices', {
    value: { getUserMedia: () => Promise.reject(new Error('no camera in jsdom')) },
    configurable: true,
  });

  container = dom.window.document.getElementById('root')!;
});

after(() => {
  try {
    root?.unmount();
  } catch {
    /* ignore */
  }
  dom.window.close();
});

test('the studio mounts without throwing and wires up a visible source video', async () => {
  const React = (await import('react')).default;
  const { createRoot } = await import('react-dom/client');
  const { act } = await import('react');
  const App = (await import('../src/App')).default;

  await act(async () => {
    root = createRoot(container);
    root.render(React.createElement(App));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });

  const videos = Array.from(container.querySelectorAll('video')) as HTMLVideoElement[];
  assert.equal(videos.length, 2, 'source + camera decoder monitors must both exist');

  for (const v of videos) {
    // REGRESSION GUARD: the old layout parked these under an opaque canvas.
    // Anything that makes them display:none / 0px / transparent stops mobile
    // browsers presenting frames, which is exactly the "black preview and
    // black export" bug.
    const style = dom.window.getComputedStyle(v);
    assert.notEqual(style.display, 'none', 'decoder video must not be display:none');
    assert.notEqual(style.visibility, 'hidden', 'decoder video must not be hidden');
    assert.notEqual(style.opacity, '0', 'decoder video must not be fully transparent');
    assert.equal(v.playsInline, true, 'playsInline is required on iOS');
  }

  const canvas = container.querySelector('canvas');
  assert.ok(canvas, 'composite canvas must exist');
});

test('the default sample clip is assigned to the source video element', async () => {
  const videos = Array.from(container.querySelectorAll('video')) as HTMLVideoElement[];
  const withSrc = videos.filter((v) => v.getAttribute('src') || v.src);
  assert.ok(withSrc.length >= 1, 'the selected clip must reach a <video> element');
  const src = withSrc[0].getAttribute('src') || withSrc[0].src;
  assert.match(src, /proxy-video/, 'sample clips must be served same-origin so the canvas is not tainted');
});

test('every sample clip is routed through the same-origin proxy', async () => {
  const { SAMPLE_VIDEOS } = await import('../src/utils/sampleVideos');
  for (const clip of SAMPLE_VIDEOS) {
    assert.match(
      clip.url,
      /^\/api\/proxy-video\?url=/,
      `${clip.title} must be proxied — a raw cross-origin URL taints the canvas and makes captureStream() fail`
    );
  }
});
