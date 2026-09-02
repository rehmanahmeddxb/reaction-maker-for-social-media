/**
 * Minimal DOM/canvas stub so the frame-probing logic can be exercised in Node.
 * Only the surface videoLoader.ts actually touches is implemented.
 */

export interface FakeVideoOptions {
  width?: number;
  height?: number;
  readyState?: number;
  /** RGB triplet every probed pixel resolves to, or a per-pixel function. */
  pixel?: [number, number, number] | ((i: number, total: number) => [number, number, number]);
  /** Make drawImage throw, e.g. to model a decode failure. */
  throwOnDraw?: boolean;
  /** Make getImageData throw, modelling a tainted canvas. */
  tainted?: boolean;
  error?: { code: number } | null;
  src?: string;
  duration?: number;
}

class FakeVideo {
  private listeners: Record<string, Array<(e: any) => void>> = {};
  private _currentTime = 0;
  /** Every currentTime the caller seeked to, in order. */
  seeks: number[] = [];
  videoWidth: number;
  videoHeight: number;
  readyState: number;
  error: { code: number } | null;
  src: string;
  srcObject: unknown = null;
  duration = 10;
  paused = true;
  muted = false;
  volume = 1;
  playsInline = true;
  preload = 'auto';
  opts: FakeVideoOptions;

  constructor(opts: FakeVideoOptions = {}) {
    this.opts = opts;
    this.videoWidth = opts.width ?? 1280;
    this.videoHeight = opts.height ?? 720;
    this.readyState = opts.readyState ?? 4;
    this.error = opts.error ?? null;
    this.src = opts.src ?? 'blob:fake';
    if (opts.duration !== undefined) this.duration = opts.duration;
  }

  get currentTime() {
    return this._currentTime;
  }
  set currentTime(t: number) {
    this._currentTime = t;
    this.seeks.push(t);
    // Real elements fire `seeked` asynchronously once the frame is ready.
    setTimeout(() => this.dispatch('seeked'), 0);
  }

  dispatch(type: string) {
    (this.listeners[type] || []).slice().forEach((fn) => fn({ type }));
  }

  addEventListener(type: string, fn: (e: any) => void) {
    (this.listeners[type] ||= []).push(fn);
  }
  removeEventListener(type: string, fn: (e: any) => void) {
    this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn);
  }
  requestVideoFrameCallback(cb: () => void) {
    setTimeout(cb, 0);
    return 1;
  }
  setAttribute() {}
  removeAttribute() {}
  pause() {
    this.paused = true;
  }
  async play() {
    this.paused = false;
  }
  load() {}
}

class FakeContext2D {
  canvas: FakeCanvas;
  filter = 'none';
  constructor(canvas: FakeCanvas) {
    this.canvas = canvas;
  }
  lastDrawn: FakeVideo | null = null;

  clearRect() {}
  drawImage(img: any) {
    if (img && img.opts && img.opts.throwOnDraw) {
      throw new Error('decode failure');
    }
    this.lastDrawn = img;
  }
  getImageData(_x: number, _y: number, w: number, h: number) {
    const img = this.lastDrawn;
    if (img && img.opts.tainted) {
      const err: any = new Error('SecurityError');
      err.name = 'SecurityError';
      throw err;
    }
    const total = w * h;
    const data = new Uint8ClampedArray(total * 4);
    for (let i = 0; i < total; i++) {
      let rgb: [number, number, number] = [0, 0, 0];
      if (img) {
        const p = img.opts.pixel;
        if (typeof p === 'function') rgb = p(i, total);
        else if (Array.isArray(p)) rgb = p;
      }
      data[i * 4] = rgb[0];
      data[i * 4 + 1] = rgb[1];
      data[i * 4 + 2] = rgb[2];
      data[i * 4 + 3] = 255;
    }
    return { data, width: w, height: h };
  }
}

class FakeCanvas {
  width = 300;
  height = 150;
  private ctx: FakeContext2D | null = null;
  getContext(kind: string) {
    if (kind !== '2d') return null;
    if (!this.ctx) this.ctx = new FakeContext2D(this);
    return this.ctx;
  }
  toDataURL() {
    return 'data:image/jpeg;base64,FAKE';
  }
}

export function installFakeDom() {
  const g = globalThis as any;
  if (g.document) return;
  g.document = {
    createElement(tag: string) {
      if (tag === 'canvas') return new FakeCanvas();
      if (tag === 'video') return new FakeVideo();
      return {};
    },
    body: { appendChild() {} },
  };
  g.HTMLVideoElement = FakeVideo;
  g.HTMLImageElement = class {};
  g.HTMLCanvasElement = FakeCanvas;
}

export function makeVideo(opts: FakeVideoOptions = {}) {
  return new FakeVideo(opts) as unknown as HTMLVideoElement;
}
