import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface SourceVideo {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
}

export interface StudioSettings {
  mainFeed: 'camera' | 'video';
  layout: 'pip-bottom-right' | 'pip-bottom-left' | 'pip-top-right' | 'pip-top-left';
  cameraFacingMode: 'user' | 'environment';
  mirrorCamera: boolean;
  aspectRatio: '16:9' | '9:16' | '1:1';
  pipSizePercent: number;
  showWatermark: boolean;
  watermarkText: string;
  showTimerBadgeOnCanvas: boolean;
  autoTranscribe: boolean;
  sourceVolume: number;
  micVolume: number;
}

const SAMPLE_VIDEOS: SourceVideo[] = [
  { id: '1', title: 'Funny Cats', url: '', thumbnail: '' },
  { id: '2', title: 'Action Sports', url: '', thumbnail: '' },
];

const DEFAULT_SETTINGS: StudioSettings = {
  mainFeed: 'camera',
  layout: 'pip-bottom-right',
  cameraFacingMode: 'user',
  mirrorCamera: true,
  aspectRatio: '16:9',
  pipSizePercent: 32,
  showWatermark: false,
  watermarkText: 'Reaction Studio',
  showTimerBadgeOnCanvas: false,
  autoTranscribe: false,
  sourceVolume: 0.8,
  micVolume: 1.0,
};

export default function App() {
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [selectedVideo, setSelectedVideo] = useState<SourceVideo | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micActive, setMicActive] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; x: number; y: number; scale: number }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const mediaUnlockedRef = useRef<boolean>(false);
  const lastProbeRef = useRef<number>(0);
  const sourceStatusRef = useRef<{ painting: boolean; message: string }>({ painting: false, message: 'Waiting for video…' });

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: settings.cameraFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        setCameraActive(true);
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.muted = true;
          await cameraVideoRef.current.play().catch(() => {});
        }
      } catch (e: any) {
        console.warn('Camera error:', e);
        setCameraError('Camera unavailable. ' + (e.name === 'NotAllowedError' ? 'Please allow camera access in your browser.' : e.message));
        setCameraActive(false);
      }
    };
    startCamera();
    return () => {
      if (cameraVideoRef.current?.srcObject) {
        // @ts-ignore
        cameraVideoRef.current.srcObject.getTracks().forEach((t: any) => t.stop());
      }
    };
  }, [settings.cameraFacingMode]);

  // Unlock media playback on user gesture
  useEffect(() => {
    const unlock = async () => {
      if (mediaUnlockedRef.current) return;
      mediaUnlockedRef.current = true;
      const vid = sourceVideoRef.current;
      if (vid) {
        vid.muted = true;
        try {
          await vid.play();
          vid.pause();
          vid.currentTime = 0;
        } catch (e) {
          console.warn('Source video play error:', e);
        }
      }
      const cam = cameraVideoRef.current;
      if (cam) {
        try {
          await cam.play();
          cam.pause();
          cam.currentTime = 0;
        } catch (e) {
          console.warn('Camera play error:', e);
        }
      }
    };
    const opts = { capture: true } as AddEventListenerOptions;
    window.addEventListener('pointerdown', unlock, opts);
    window.addEventListener('touchstart', unlock, opts);
    window.addEventListener('keydown', unlock, opts);
    return () => {
      window.removeEventListener('pointerdown', unlock, opts);
      window.removeEventListener('touchstart', unlock, opts);
      window.removeEventListener('keydown', unlock, opts);
    };
  }, []);

  // Video probe to detect if source is painting
  useEffect(() => {
    const probeLoop = () => {
      const vid = sourceVideoRef.current;
      if (!vid) return;
      const now = Date.now();
      if (now - lastProbeRef.current > 300) {
        lastProbeRef.current = now;
        const painting = vid.readyState >= 2 && vid.videoWidth > 0 && vid.videoHeight > 0;
        const message = painting ? 'Painting' : 'Loading video…';
        sourceStatusRef.current = { painting, message };
      }
      animFrameRef.current = requestAnimationFrame(probeLoop);
    };
    animFrameRef.current = requestAnimationFrame(probeLoop);
    return () => {
      cancelAnimationFrame(animFrameRef.current!);
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording, isPaused]);

  // Handle start recording
  const handleStartRecording = useCallback(async () => {
    if (!canvasRef.current) return;
    if (!mediaUnlockedRef.current) return;

    const vid = sourceVideoRef.current;
    if (vid) {
      vid.muted = true;
      try {
        await vid.play();
        vid.pause();
        vid.currentTime = 0;
      } catch (e) {
        console.warn('Source video play error:', e);
      }
    }

    setIsCountingDown(true);
    setCountdownValue(3);
    setRecordingSeconds(0);

    setTimeout(async () => {
      setIsCountingDown(false);
      setIsRecording(true);
      setIsPaused(false);

      try {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error('Canvas not available');

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        // Make sure video is playing
        if (vid) {
          vid.muted = false;
          vid.volume = settings.sourceVolume;
        }

        // MediaRecorder with proper mime type
        const mimeType = 'video/webm;codecs=vp8,opus';
        let mediaRecorder: MediaRecorder;
        try {
          // @ts-ignore - captureStream API
          mediaRecorder = new MediaRecorder(canvas.captureStream(30), { mimeType });
        } catch (e: any) {
          throw new Error('Canvas is tainted or captureStream not supported. Please use local files or the URL tab.');
        }

        mediaRecorder.ondataavailable = (e: any) => {
          if (e.data && e.data.size > 0) {
            const blobUrl = URL.createObjectURL(e.data);
            // Create a download link
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `reaction-${Date.now()}.webm`;
            link.click();
            URL.revokeObjectURL(blobUrl);
          }
        };

        mediaRecorder.start(1000); // 1 second timeslice
        setTimeout(() => {
          setIsRecording(false);
          mediaRecorder.stop();
        }, 5000); // Record for 5 seconds
      } catch (err: any) {
        console.error('Recording error:', err);
        setCameraError(err.message || 'Recording failed');
        setIsRecording(false);
        setIsPaused(false);
      }
    }, 3000); // 3 second countdown
  }, [settings.sourceVolume]);

  // Pause/Resume
  const handlePause = useCallback(() => {
    setIsPaused(!isPaused);
    if (sourceVideoRef.current) {
      sourceVideoRef.current.pause();
    }
  }, [isPaused]);

  // Stop recording
  const handleStop = useCallback(() => {
    setIsRecording(false);
    setIsPaused(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Render
  const canvasStyle = {
    width: '100%',
    height: 'calc(100vh - 80px)',
    background: '#000',
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 font-sans">
      <h1 className="text-2xl mb-4">Reaction Studio</h1>

      {/* Source video selector */}
      <div className="mb-4">
        <label className="font-medium mb-2 block">Select Video:</label>
        <select
          onChange={(e: any) => {
            const videoId = e.target.value;
            const video = SAMPLE_VIDEOS.find((v: any) => v.id === videoId);
            if (video) {
              setSelectedVideo(video);
              if (sourceVideoRef.current) {
                sourceVideoRef.current.src = video.url || '';
                sourceVideoRef.current.load();
              }
            }
          }}
        >
          <option value="">-- No video --</option>
          {SAMPLE_VIDEOS.map((v: any) => (
            <option key={v.id} value={v.id}>
              {v.title}
            </option>
          ))}
        </select>
      </div>

      {/* Camera video */}
      {cameraActive && cameraVideoRef.current && (
        <video
          ref={cameraVideoRef}
          playsInline
          muted
          className="hidden"
        />
      )}

      {/* Source video */}
      {selectedVideo && sourceVideoRef.current && (
        <video
          ref={sourceVideoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover"
        />
      )}

      {/* Canvas for compositing */}
      <canvas
        ref={canvasRef}
        style={canvasStyle}
        className="relative"
      />

      {/* Controls */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleStartRecording}
          disabled={isRecording || !selectedVideo || !canvasRef.current}
          className={`
            px-4 py-2 bg-green-600 text-white rounded
            ${isRecording ? 'bg-red-600' : ''}
            disabled:${isRecording || !selectedVideo || !canvasRef.current}
          `}
        >
          {isCountingDown ? `Get ready (${countdownValue})` : isRecording ? 'Recording…' : 'Start Recording'}
        </button>
        <button onClick={handlePause} disabled={!isRecording} className="px-4 py-2 bg-blue-600 text-white rounded">
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={handleStop} disabled={!isRecording} className="px-4 py-2 bg-gray-600 text-white rounded">
          Stop
        </button>
      </div>

      {/* Status */}
      {sourceStatusRef.current && (
        <p className="mt-2 text-sm {sourceStatusRef.current.painting ? 'text-green-400' : 'text-yellow-400'}">
          {sourceStatusRef.current.message}
        </p>
      )}

      {/* Timer */}
      {isRecording && !isPaused && (
        <p className="mt-2 text-lg font-medium">{recordingSeconds}s</p>
      )}
    </div>
  );
}