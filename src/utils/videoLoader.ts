/**
 * Helpers so local (and remote) videos actually decode a *visible* frame that
 * the canvas can paint.
 *
 * Three separate things can make a <video> paint black onto a canvas:
 *   1. The element has metadata but no decoded frame yet (readyState < 2).
 *   2. The element has a frame, but the browser never *presented* it because
 *      the element is display:none / opacity:0 / zero-size / fully occluded.
 *      Mobile Chrome and Safari are aggressive about this.
 *   3. The element decoded a genuinely black frame (fades-in, leader frames)
 *      which looks identical to "broken" to a user.
 *
 * Everything below exists to detect and fix those three cases explicitly
 * instead of hoping a frame shows up.
 */

export function guessVideoMime(fileName: string, type?: string): string {
  if (type && type.startsWith('video/')) return type;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    case 'mkv':
      return 'video/x-matroska';
    case 'ogv':
    case 'ogg':
      return 'video/ogg';
    case 'avi':
      return 'video/x-msvideo';
    case 'm4v':
    case 'mp4':
    default:
      return 'video/mp4';
  }
}

export function isVideoDrawable(video: HTMLVideoElement | null | undefined): boolean {
  if (!video) return false;
  // HAVE_CURRENT_DATA (2) — metadata-only (readyState 1) still paints black.
  return video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
}

/* ------------------------------------------------------------------ */
/* Frame probing                                                       */
/* ------------------------------------------------------------------ */

export interface FrameProbeResult {
  /** drawImage() completed without throwing (not tainted / not a 0x0 source). */
  drawn: boolean;
  /** Mean luma 0..255 of the probed frame. */
  luma: number;
  /** Max channel spread — tells a flat black frame from a dark-but-real one. */
  spread: number;
  /** Frame carries actual picture information. */
  visible: boolean;
  /** drawImage threw (tainted canvas / decode error). */
  error?: string;
}

const PROBE_SIZE = 16;
let probeCanvas: HTMLCanvasElement | null = null;
let probeCtx: CanvasRenderingContext2D | null = null;

function getProbeCtx(): CanvasRenderingContext2D | null {
  if (probeCtx) return probeCtx;
  if (typeof document === 'undefined') return null;
  probeCanvas = document.createElement('canvas');
  probeCanvas.width = PROBE_SIZE;
  probeCanvas.height = PROBE_SIZE;
  probeCtx = probeCanvas.getContext('2d', { willReadFrequently: true });
  return probeCtx;
}

/**
 * Pure pixel analysis — exported so it can be unit tested without a browser.
 * `data` is RGBA bytes.
 */
export function analyzeFramePixels(data: Uint8ClampedArray | number[]): {
  luma: number;
  spread: number;
  visible: boolean;
} {
  let total = 0;
  let min = 255;
  let max = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    total += luma;
    if (luma < min) min = luma;
    if (luma > max) max = luma;
    count++;
  }

  if (count === 0) return { luma: 0, spread: 0, visible: false };

  const mean = total / count;
  const spread = max - min;

  // A frame counts as visible when it is either not-basically-black on
  // average, or it has real contrast in it (a dark scene with highlights).
  const visible = mean > 3.5 || spread > 12;
  return { luma: mean, spread, visible };
}

/** Draw a video into a tiny offscreen canvas and report what actually landed. */
export function probeVideoFrame(video: HTMLVideoElement | null | undefined): FrameProbeResult {
  const empty: FrameProbeResult = { drawn: false, luma: 0, spread: 0, visible: false };
  if (!isVideoDrawable(video)) return empty;

  const ctx = getProbeCtx();
  if (!ctx) return empty;

  try {
    ctx.clearRect(0, 0, PROBE_SIZE, PROBE_SIZE);
    ctx.drawImage(video as HTMLVideoElement, 0, 0, PROBE_SIZE, PROBE_SIZE);
  } catch (err: any) {
    return { ...empty, error: err?.message || 'drawImage failed' };
  }

  try {
    const { data } = ctx.getImageData(0, 0, PROBE_SIZE, PROBE_SIZE);
    const stats = analyzeFramePixels(data);
    return { drawn: true, ...stats };
  } catch (err: any) {
    // getImageData throws on a tainted canvas — the draw itself still worked,
    // so treat it as visible (a tainted canvas paints fine, it just can't be
    // read back), but flag it so the UI can explain export limitations.
    return { drawn: true, luma: 0, spread: 0, visible: true, error: 'tainted' };
  }
}

/* ------------------------------------------------------------------ */
/* Event helpers                                                       */
/* ------------------------------------------------------------------ */

function waitForEvent(
  target: EventTarget,
  event: string,
  timeoutMs: number,
  errorEvent?: string
): Promise<'ok' | 'timeout'> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve('timeout');
    }, timeoutMs);

    const onOk = () => {
      cleanup();
      resolve('ok');
    };
    const onErr = () => {
      cleanup();
      reject(new Error('Browser could not decode this video. Try MP4 (H.264) or WebM.'));
    };

    const cleanup = () => {
      clearTimeout(timer);
      target.removeEventListener(event, onOk);
      if (errorEvent) target.removeEventListener(errorEvent, onErr);
    };

    target.addEventListener(event, onOk, { once: true });
    if (errorEvent) target.addEventListener(errorEvent, onErr, { once: true });
  });
}

/** Resolve once the compositor has a *presented* frame (or the timeout hits). */
export function waitForPresentedFrame(video: HTMLVideoElement, timeoutMs = 800): Promise<boolean> {
  const rvfc = (
    video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
      cancelVideoFrameCallback?: (handle: number) => void;
    }
  ).requestVideoFrameCallback;

  if (typeof rvfc !== 'function') {
    return waitForEvent(video, 'loadeddata', timeoutMs)
      .then((r) => r === 'ok')
      .catch(() => false);
  }

  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(false);
    }, timeoutMs);

    rvfc.call(video, () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(true);
    });
  });
}

/** Seek and wait for the seek to complete (best effort, never throws). */
export async function seekTo(video: HTMLVideoElement, time: number, timeoutMs = 1500): Promise<void> {
  if (!Number.isFinite(time) || time < 0) return;
  try {
    video.currentTime = time;
  } catch {
    return;
  }
  await waitForEvent(video, 'seeked', timeoutMs).catch(() => undefined);
  // Give the compositor a beat to actually present the seeked frame.
  await waitForPresentedFrame(video, 400);
}

/**
 * Attach a temporary in-viewport video so the browser actually decodes pixels.
 * Off-screen / opacity:0 / display:none elements often never produce a frame,
 * so this deliberately sits inside the viewport at full opacity behind an
 * (also in-viewport) transparent stacking position.
 */
export function mountDecoderVideo(): HTMLVideoElement {
  const video = document.createElement('video');
  video.preload = 'auto';
  video.playsInline = true;
  video.muted = true;
  video.autoplay = false;
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.disablePictureInPicture = true;
  video.style.cssText = [
    'position:fixed',
    'left:0px',
    'bottom:0px',
    'width:120px',
    'height:68px',
    // Fully opaque + on top: this is the only reliable way to guarantee mobile
    // Chrome/Safari actually presents frames we can copy to a canvas.
    'opacity:1',
    'pointer-events:none',
    'z-index:2147483647',
    'object-fit:cover',
    'background:#000',
    'border-radius:6px',
  ].join(';');
  document.body.appendChild(video);
  return video;
}

/**
 * Some browsers refuse to decode/present until the element has been played
 * once inside a user gesture. Call this from a click/tap handler.
 */
export async function unlockVideoPlayback(video: HTMLVideoElement | null | undefined): Promise<void> {
  if (!video) return;
  if (!video.src && !video.srcObject) return;
  const wasMuted = video.muted;
  const wasPaused = video.paused;
  const at = video.currentTime;
  try {
    video.muted = true;
    await video.play();
    await waitForPresentedFrame(video, 300);
    if (wasPaused) {
      video.pause();
      try {
        video.currentTime = at;
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* autoplay blocked — nothing else we can do here */
  } finally {
    video.muted = wasMuted;
  }
}

/**
 * Force the element to decode at least one *visible* frame.
 *
 * `mode: 'play'` uses a muted play/pause (needs a user gesture on iOS).
 * `mode: 'seek'` only nudges currentTime — safe from App effects that must
 * not steal audio or pause a take the user just started.
 *
 * Returns the probe result of the frame we ended up on.
 */
export async function primeVideoFrame(
  video: HTMLVideoElement,
  mode: 'play' | 'seek' = 'play'
): Promise<FrameProbeResult> {
  if (!video.src && !video.srcObject) {
    return { drawn: false, luma: 0, spread: 0, visible: false };
  }

  if (video.readyState < 1) {
    await waitForEvent(video, 'loadedmetadata', 8000, 'error').catch(() => undefined);
  }

  video.playsInline = true;

  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const wasMuted = video.muted;

  try {
    if (mode === 'play') {
      video.muted = true;
      try {
        await video.play();
        await waitForPresentedFrame(video, 700);
        video.pause();
      } catch {
        // Autoplay blocked; seeking below can still decode a frame.
      }
    }

    // Candidate timestamps: early frames first, then further in so a black
    // fade-in / letterbox leader doesn't get mistaken for a broken file.
    const candidates: number[] = [];
    if (duration > 0) {
      candidates.push(
        Math.min(0.12, duration * 0.02),
        duration * 0.05,
        duration * 0.15,
        duration * 0.35,
        duration * 0.5
      );
    } else {
      candidates.push(0.12);
    }

    let best: FrameProbeResult = probeVideoFrame(video);
    if (best.visible) return best;

    for (const t of candidates) {
      if (!Number.isFinite(t) || t <= 0) continue;
      await seekTo(video, t);
      const probe = probeVideoFrame(video);
      if (probe.luma > best.luma || probe.spread > best.spread) best = probe;
      if (probe.visible) return probe;
    }

    return best;
  } catch {
    return probeVideoFrame(video);
  } finally {
    if (mode === 'play') video.muted = wasMuted;
  }
}

export async function createObjectUrlForVideoFile(file: File): Promise<string> {
  const mime = guessVideoMime(file.name, file.type);
  // Always wrap in a Blob with an explicit MIME type. Some Android/iOS pickers
  // hand us a File with an empty type, which then never decodes in <video>.
  if (file.type && file.type.startsWith('video/')) {
    return URL.createObjectURL(file);
  }
  const buffer = await file.arrayBuffer();
  const blob = new Blob([buffer], { type: mime });
  return URL.createObjectURL(blob);
}

/**
 * Grab a poster thumbnail. Returns '' when the frame is effectively black so
 * callers never install an all-black poster that silently masks a real
 * decoding failure behind "looks like it's working".
 */
export function captureVideoThumbnail(video: HTMLVideoElement, allowDark = false): string {
  if (!video.videoWidth || !video.videoHeight) return '';

  const probe = probeVideoFrame(video);
  if (!probe.drawn) return '';
  if (!allowDark && !probe.visible && probe.error !== 'tainted') return '';

  try {
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(720, video.videoWidth);
    canvas.height = Math.max(
      1,
      Math.round(canvas.width * (video.videoHeight / video.videoWidth))
    );
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return '';
  }
}

/** Human readable reason a video isn't painting, for the diagnostics chip. */
export function describeVideoState(
  video: HTMLVideoElement | null | undefined,
  probe?: FrameProbeResult
): string {
  if (!video) return 'No video element';
  if (video.error) {
    const codes: Record<number, string> = {
      1: 'Loading aborted',
      2: 'Network error while loading',
      3: 'Decode error — codec not supported by this browser',
      4: 'Source not supported (try MP4 / H.264 or WebM)',
    };
    return codes[video.error.code] || 'Video element error';
  }
  if (!video.src && !video.srcObject) return 'No source assigned';
  if (video.readyState < 1) return 'Loading metadata…';
  if (video.videoWidth === 0) return 'Audio-only or no video track';
  if (video.readyState < 2) return 'Buffering first frame…';
  if (probe && probe.error === 'tainted') return 'Cross-origin video (export blocked)';
  if (probe && probe.drawn && !probe.visible) return 'Frame is black at this timestamp';
  return 'Painting';
}
