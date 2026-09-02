/** Helpers so local (and remote) videos actually decode a frame the canvas can paint. */

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

function waitForEvent(target: EventTarget, event: string, timeoutMs: number, errorEvent?: string) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);

    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error('Browser could not decode this video. Try MP4 (H.264) or WebM.'));
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      target.removeEventListener(event, onOk);
      if (errorEvent) target.removeEventListener(errorEvent, onErr);
    };

    target.addEventListener(event, onOk, { once: true });
    if (errorEvent) target.addEventListener(errorEvent, onErr, { once: true });
  });
}

/**
 * Attach a temporary in-viewport video so the browser actually decodes pixels.
 * Off-screen / opacity:0 / display:none elements often never produce a frame.
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
    'left:0',
    'top:0',
    'width:160px',
    'height:90px',
    'opacity:0.02',
    'pointer-events:none',
    'z-index:-1',
    'object-fit:cover',
  ].join(';');
  document.body.appendChild(video);
  return video;
}

/**
 * Force the element to decode at least one visible frame.
 * Paused videos sitting at t=0 commonly have a black framebuffer.
 *
 * `mode: 'play'` uses a muted play/pause (needs a user gesture on iOS).
 * `mode: 'seek'` only nudges currentTime — safe from App effects that must
 * not steal audio or pause a take the user just started.
 */
export async function primeVideoFrame(
  video: HTMLVideoElement,
  mode: 'play' | 'seek' = 'play'
): Promise<void> {
  if (!video.src && !video.srcObject) return;

  if (video.readyState < 1) {
    await waitForEvent(video, 'loadedmetadata', 5000, 'error').catch(() => undefined);
  }

  video.playsInline = true;

  try {
    if (Number.isFinite(video.duration) && video.duration > 0 && video.currentTime < 0.01) {
      try {
        video.currentTime = Math.min(0.08, Math.max(0.04, video.duration * 0.01));
        await waitForEvent(video, 'seeked', 800);
      } catch {
        // ignore seek failures
      }
    }

    if (mode === 'play') {
      const wasMuted = video.muted;
      video.muted = true;
      try {
        await video.play();
      } catch {
        // Autoplay may be blocked; a successful seek can still decode a frame.
      }

      const rvfc = (
        video as HTMLVideoElement & {
          requestVideoFrameCallback?: (cb: () => void) => number;
        }
      ).requestVideoFrameCallback;
      if (typeof rvfc === 'function') {
        await new Promise<void>((resolve) => {
          const timer = window.setTimeout(() => resolve(), 600);
          rvfc.call(video, () => {
            window.clearTimeout(timer);
            resolve();
          });
        });
      } else if (video.readyState < 2) {
        await waitForEvent(video, 'loadeddata', 1500);
      }

      try {
        video.pause();
      } catch {
        // ignore
      }
      video.muted = wasMuted;
    }
  } catch {
    // ignore priming failures — compositor will use the poster thumbnail
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

export function captureVideoThumbnail(video: HTMLVideoElement): string {
  if (!video.videoWidth || !video.videoHeight) return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(720, video.videoWidth);
    canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return '';
  }
}
