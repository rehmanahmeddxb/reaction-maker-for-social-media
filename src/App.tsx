import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StudioSettings,
  SourceVideo,
  RecordedTake,
  FloatingReaction,
  LayoutMode,
  CameraShape,
  AspectRatio,
} from './types';
import { SAMPLE_VIDEOS } from './utils/sampleVideos';
import { audioEngine } from './utils/audioSynthesizer';
import { FallbackAvatarRenderer } from './utils/fallbackAvatarGenerator';
import { ReactionMediaRecorder } from './utils/mediaMixer';
import { getCanvasDimensions, renderReactionFrame } from './utils/canvasCompositor';
import { liveTranscription, TranscriptionSubtitle } from './utils/transcriptionService';
import { Navbar } from './components/Navbar';
import { ReactionStudioStage } from './components/ReactionStudioStage';
import { StudioControls } from './components/StudioControls';
import { SourceVideoSelector } from './components/SourceVideoSelector';
import { SoundboardDrawer } from './components/SoundboardDrawer';
import { LayoutCustomizerModal } from './components/LayoutCustomizerModal';
import { CanvasSetupModal } from './components/CanvasSetupModal';
import { TakesHistoryDrawer } from './components/TakesHistoryDrawer';
import { PlaybackExportModal } from './components/PlaybackExportModal';
import { TranscribeModal } from './components/TranscribeModal';
import { flashlightService, FlashlightMode, FrontFlashTone } from './utils/flashlightService';
import { saveTakeToStorage, loadTakesFromStorage, deleteTakeFromStorage } from './utils/takesStorage';

const DEFAULT_SETTINGS: StudioSettings = {
  mainFeed: 'camera', // Camera as full background, video clip in draggable PiP box
  layout: 'pip-bottom-right',
  cameraShape: 'rectangle', // Rectangle / Square corner PiP
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
  // Flashlight default state: off
  flashlightMode: 'off',
  frontFlashBrightness: 0.95,
  frontFlashTone: 'daylight',
  sourceVolume: 0.8,
  micVolume: 1.0,
  sfxVolume: 0.8,
  overlayTitle: '',
  // Watermark & Timer Seconds: Disabled by default for clean export without unwanted badges
  showWatermark: false,
  watermarkText: '⚡ Reaction Studio',
  showTimerBadgeOnCanvas: false,
  filter: 'none',
  autoTranscribe: true,
  transcriptionPrimaryLang: 'en-US',
  transcriptionSecondaryLang: 'zh-CN',
  transcriptionBilingual: true,
  autoHideVideoOnPause: true,
};

export default function App() {
  // Studio Configuration State
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);
  const [selectedVideo, setSelectedVideo] = useState<SourceVideo | null>(SAMPLE_VIDEOS[0]);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);

  // Hardware Streams & Devices
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micActive, setMicActive] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [micAudioLevel, setMicAudioLevel] = useState(0);
  const [sourceAudioLevel, setSourceAudioLevel] = useState(0);

  // Floating Animated Reactions
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  // Takes & Modals State
  const [takes, setTakes] = useState<RecordedTake[]>([]);
  const [activeTake, setActiveTake] = useState<RecordedTake | null>(null);

  // Subtitle & Transcribe State
  const [activeSubtitle, setActiveSubtitle] = useState<TranscriptionSubtitle | null>(null);
  const [isTranscribeModalOpen, setIsTranscribeModalOpen] = useState(false);

  // Modal dialog states
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(true); // Prompts user on launch as requested
  const [isSourceSelectorOpen, setIsSourceSelectorOpen] = useState(false);
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);
  const [isLayoutCustomizerOpen, setIsLayoutCustomizerOpen] = useState(false);
  const [isTakesDrawerOpen, setIsTakesDrawerOpen] = useState(false);
  const [isPlaybackModalOpen, setIsPlaybackModalOpen] = useState(false);

  // DOM & Engine Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackAvatarRef = useRef<FallbackAvatarRenderer | null>(null);
  const recorderRef = useRef<ReactionMediaRecorder | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // High Performance Render Refs to prevent any frame drops or slow loops
  const settingsRef = useRef<StudioSettings>(settings);
  settingsRef.current = settings;

  const isRecordingRef = useRef<boolean>(isRecording);
  isRecordingRef.current = isRecording;

  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  const activeSubtitleRef = useRef<TranscriptionSubtitle | null>(activeSubtitle);
  activeSubtitleRef.current = activeSubtitle;

  const recordingSecondsRef = useRef<number>(recordingSeconds);
  recordingSecondsRef.current = recordingSeconds;

  const floatingReactionsRef = useRef<FloatingReaction[]>(floatingReactions);
  floatingReactionsRef.current = floatingReactions;

  // Initialize Virtual Avatar Engine and restore saved takes from IndexedDB
  useEffect(() => {
    fallbackAvatarRef.current = new FallbackAvatarRenderer();
    fallbackAvatarRef.current.start();
    recorderRef.current = new ReactionMediaRecorder();

    // Restore previously saved studio takes from IndexedDB
    loadTakesFromStorage().then((savedTakes) => {
      if (savedTakes && savedTakes.length > 0) {
        setTakes(savedTakes);
      }
    });

    return () => {
      fallbackAvatarRef.current?.stop();
    };
  }, []);

  // Sync Source Video URL to decoding video element
  useEffect(() => {
    const vid = sourceVideoRef.current;
    if (vid && selectedVideo) {
      vid.pause();
      const url = selectedVideo.url;

      // CRITICAL: NEVER set crossorigin for blob: or data: URLs, otherwise browser blocks local files!
      if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('/')) {
        vid.removeAttribute('crossorigin');
      } else {
        vid.setAttribute('crossorigin', 'anonymous');
      }

      vid.src = url;
      vid.currentTime = 0;
      vid.load();

      const primeFirstFrame = () => {
        try {
          if (vid.currentTime === 0 && vid.duration > 0) {
            vid.currentTime = 0.001; // Decodes first frame into buffer so canvas renders immediately
          }
        } catch {
          // ignore seek glitch
        }
      };

      vid.addEventListener('loadeddata', primeFirstFrame, { once: true });
      vid.addEventListener('loadedmetadata', primeFirstFrame, { once: true });

      return () => {
        vid.removeEventListener('loadeddata', primeFirstFrame);
        vid.removeEventListener('loadedmetadata', primeFirstFrame);
      };
    }
  }, [selectedVideo]);

  // Adjust source video volume
  useEffect(() => {
    if (sourceVideoRef.current) {
      sourceVideoRef.current.volume = settings.sourceVolume;
    }
  }, [settings.sourceVolume]);

  // Request Camera Stream with high frame rate & smooth resolution and facingMode
  const startCamera = async (facingMode?: 'user' | 'environment') => {
    const targetFacing = facingMode || settingsRef.current.cameraFacingMode || 'user';
    setCameraError(null);
    try {
      // Stop existing camera track if replacing
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }

      // Best camera parameters for natural, non-laggy flow
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 60, min: 15 },
          facingMode: { ideal: targetFacing },
        },
      });
      setCameraStream(stream);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraVideoRef.current.muted = true;
        cameraVideoRef.current.playsInline = true;
        await cameraVideoRef.current.play().catch((err) => {
          console.warn('Camera video element play catch:', err);
        });
      }
      setCameraActive(true);
      setCameraError(null);
    } catch (e: any) {
      console.warn('High-spec camera init error, attempting standard fallback:', e);
      try {
        const basicStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: targetFacing },
        });
        setCameraStream(basicStream);
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = basicStream;
          cameraVideoRef.current.muted = true;
          cameraVideoRef.current.playsInline = true;
          await cameraVideoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
        setCameraError(null);
      } catch (fallbackErr: any) {
        console.warn('Camera hardware unavailable, attempting any video device:', fallbackErr);
        try {
          const minimalStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setCameraStream(minimalStream);
          if (cameraVideoRef.current) {
            cameraVideoRef.current.srcObject = minimalStream;
            cameraVideoRef.current.muted = true;
            cameraVideoRef.current.playsInline = true;
            await cameraVideoRef.current.play().catch(() => {});
          }
          setCameraActive(true);
          setCameraError(null);
        } catch (finalErr: any) {
          console.warn('Camera completely unavailable, activating animated studio avatar:', finalErr);
          setCameraActive(false);
          if (finalErr.name === 'NotAllowedError' || finalErr.name === 'PermissionDeniedError') {
            setCameraError('Camera access denied. Please click the camera icon in your browser address bar to allow.');
          } else if (finalErr.name === 'NotFoundError' || finalErr.name === 'DevicesNotFoundError') {
            setCameraError('No camera detected on this system.');
          } else {
            setCameraError('Camera unavailable (' + (finalErr.message || 'Check permissions') + ')');
          }
        }
      }
    }
  };

  const switchCameraFacing = async (desiredFacing?: 'user' | 'environment') => {
    const nextFacing = desiredFacing || (settings.cameraFacingMode === 'user' ? 'environment' : 'user');
    updateSettings({ cameraFacingMode: nextFacing });
    await startCamera(nextFacing);
  };

  const cycleFlashlight = async () => {
    const modes: FlashlightMode[] = ['off', 'front', 'back', 'both'];
    const curIdx = modes.indexOf(settings.flashlightMode || 'off');
    const nextMode = modes[(curIdx + 1) % modes.length];
    updateSettings({ flashlightMode: nextMode });
    await flashlightService.setFlashlightMode(nextMode, settings.cameraFacingMode, cameraStream);
  };

  // Sync flashlight mode to hardware torch / screen softbox
  useEffect(() => {
    flashlightService.setFlashlightMode(
      settings.flashlightMode || 'off',
      settings.cameraFacingMode,
      cameraStream
    );
  }, [settings.flashlightMode, settings.cameraFacingMode, cameraStream]);

  const stopCamera = () => {
    flashlightService.turnOffBackTorch(cameraStream);
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Request Microphone Stream with noise reduction
  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setMicStream(stream);
      setMicActive(true);

      // Setup audio analyzer for VU meter
      const ctx = audioEngine.init();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
    } catch (e) {
      console.warn('Microphone access denied or unavailable:', e);
      setMicActive(false);
    }
  };

  const stopMic = () => {
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      setMicStream(null);
    }
    setMicActive(false);
    analyserRef.current = null;
  };

  const toggleMic = () => {
    if (micActive) {
      stopMic();
    } else {
      startMic();
    }
  };

  // Live Auto Transcription Engine sync with settings
  useEffect(() => {
    if (settings.autoTranscribe) {
      liveTranscription.setLanguages(
        settings.transcriptionPrimaryLang as any,
        settings.transcriptionBilingual ? (settings.transcriptionSecondaryLang as any) : null
      );
      liveTranscription.start((sub) => {
        setActiveSubtitle(sub);
      });
    } else {
      liveTranscription.stop();
      setActiveSubtitle(null);
    }

    return () => {
      liveTranscription.stop();
    };
  }, [
    settings.autoTranscribe,
    settings.transcriptionPrimaryLang,
    settings.transcriptionSecondaryLang,
    settings.transcriptionBilingual,
  ]);

  // Try initiating camera and mic on mount
  useEffect(() => {
    startCamera();
    startMic();

    return () => {
      stopCamera();
      stopMic();
    };
  }, []);

  // Main Canvas Compositing Animation Loop (Ultra-fast, hardware-accelerated 60 FPS)
  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const currentSettings = settingsRef.current;
        const { width, height } = getCanvasDimensions(currentSettings.aspectRatio);

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        // Measure Audio VU Level if mic active
        if (analyserRef.current) {
          const buffer = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            sum += buffer[i];
          }
          const avg = sum / buffer.length / 255;
          setMicAudioLevel(avg);
          fallbackAvatarRef.current?.setAudioLevel(avg);
        }

        // Formatted timer if recording (only burned onto canvas if explicitly opted in)
        let timerStr: string | undefined;
        if (isRecordingRef.current && currentSettings.showTimerBadgeOnCanvas) {
          const m = Math.floor(recordingSecondsRef.current / 60);
          const s = recordingSecondsRef.current % 60;
          timerStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        // When paused and autoHideVideoOnPause is enabled, hide the local source video automatically
        const shouldHideSource = isPausedRef.current && currentSettings.autoHideVideoOnPause;

        renderReactionFrame({
          ctx,
          sourceVideo: sourceVideoRef.current,
          cameraVideo: cameraVideoRef.current,
          fallbackAvatarCanvas: fallbackAvatarRef.current?.getCanvas() || null,
          settings: currentSettings,
          floatingReactions: floatingReactionsRef.current,
          currentTimeFormatted: timerStr,
          activeSubtitle: currentSettings.autoTranscribe ? activeSubtitleRef.current : null,
          isSourceVideoHidden: shouldHideSource,
        });
      }
    }

    animFrameRef.current = requestAnimationFrame(renderLoop);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [renderLoop]);

  // Floating Emoji Reaction Trigger
  const triggerReaction = (emoji: string, soundKey?: string) => {
    if (soundKey) {
      audioEngine.playSound(soundKey, settings.sfxVolume);
    }

    const { width, height } = getCanvasDimensions(settings.aspectRatio);
    const newReaction: FloatingReaction = {
      id: `reaction-${Date.now()}-${Math.random()}`,
      emoji,
      x: width * 0.2 + Math.random() * (width * 0.6),
      y: height * 0.75 + Math.random() * (height * 0.1),
      scale: 0.9 + Math.random() * 0.5,
      opacity: 1,
      rotation: (Math.random() - 0.5) * 0.6,
      timestamp: Date.now(),
    };

    setFloatingReactions((prev) => [...prev.slice(-15), newReaction]);
  };

  // Recording Timer effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Start Recording with 3-2-1 Countdown
  const handleStartRecording = async () => {
    if (!canvasRef.current) return;
    setIsCountingDown(true);
    setCountdownValue(3);
    audioEngine.playSound('ding', 0.5);

    let count = 3;
    const interval = setInterval(async () => {
      count -= 1;
      if (count > 0) {
        setCountdownValue(count);
        audioEngine.playSound('ding', 0.5);
      } else {
        clearInterval(interval);
        setIsCountingDown(false);
        setRecordingSeconds(0);
        setIsRecording(true);
        setIsPaused(false);
        audioEngine.playSound('cheer', 0.6);

        // Synchronously Play Source Video from beginning
        if (sourceVideoRef.current) {
          sourceVideoRef.current.currentTime = 0;
          try {
            await sourceVideoRef.current.play();
          } catch (e) {
            console.warn('Source video play error:', e);
          }
        }

        // Start Composite MediaRecorder
        if (recorderRef.current && canvasRef.current) {
          await recorderRef.current.startRecording({
            canvas: canvasRef.current,
            sourceVideo: sourceVideoRef.current,
            micStream: micActive ? micStream : null,
            sourceVolume: settings.sourceVolume,
            micVolume: settings.micVolume,
            fps: 30,
          });
        }
      }
    }, 1000);
  };

  // Pause Recording
  const handlePauseRecording = () => {
    setIsPaused(true);
    if (sourceVideoRef.current) {
      sourceVideoRef.current.pause();
    }
    recorderRef.current?.pauseRecording();
  };

  // Resume Recording (pre-loads/verifies frame readiness before playing to ensure smooth playback)
  const handleResumeRecording = async () => {
    setIsPaused(false);
    if (sourceVideoRef.current) {
      const vid = sourceVideoRef.current;
      if (vid.readyState < 2) {
        // Wait until video has enough data to render the current frame before play
        await new Promise<void>((resolve) => {
          const onCanPlay = () => {
            vid.removeEventListener('canplay', onCanPlay);
            resolve();
          };
          vid.addEventListener('canplay', onCanPlay);
          // Safety timeout in case frame is already rendered or static
          setTimeout(resolve, 150);
        });
      }
      try {
        await vid.play();
      } catch (e) {
        console.warn('Resume video play error:', e);
      }
    }
    recorderRef.current?.resumeRecording();
  };

  // Stop Recording & Produce Output Take
  const handleStopRecording = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    setIsPaused(false);

    if (sourceVideoRef.current) {
      sourceVideoRef.current.pause();
    }

    try {
      if (recorderRef.current) {
        const result = await recorderRef.current.stopRecording();
        const videoUrl = URL.createObjectURL(result.blob);
        const newTake: RecordedTake = {
          id: `take-${Date.now()}`,
          timestamp: Date.now(),
          duration: result.duration || recordingSeconds,
          videoBlob: result.blob,
          videoUrl,
          title: `Reaction Take: ${selectedVideo?.title || 'Reaction'}`,
          layout: settings.layout,
          aspectRatio: settings.aspectRatio,
          sizeBytes: result.blob.size,
        };

        setActiveTake(newTake);
        setTakes((prev) => [newTake, ...prev]);
        saveTakeToStorage(newTake);
        setIsPlaybackModalOpen(true);
      }
    } catch (e) {
      console.error('Stop recording error:', e);
    }
  };

  const handleResetSourceVideo = () => {
    if (sourceVideoRef.current) {
      sourceVideoRef.current.currentTime = 0;
    }
  };

  const updateSettings = (newPartial: Partial<StudioSettings>) => {
    setSettings((prev) => ({ ...prev, ...newPartial }));
  };

  const deleteTake = (id: string) => {
    setTakes((prev) => prev.filter((t) => t.id !== id));
    deleteTakeFromStorage(id);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-['Plus_Jakarta_Sans'] antialiased select-none">
      {/* Top Studio Navbar */}
      <Navbar
        isRecording={isRecording}
        isPaused={isPaused}
        recordingSeconds={recordingSeconds}
        takesCount={takes.length}
        aspectRatio={settings.aspectRatio}
        mainFeed={settings.mainFeed}
        onOpenSetupModal={() => setIsSetupModalOpen(true)}
        onOpenVideoSelector={() => setIsSourceSelectorOpen(true)}
        onOpenSoundboard={() => setIsSoundboardOpen(true)}
        onOpenLayoutCustomizer={() => setIsLayoutCustomizerOpen(true)}
        onOpenTakesDrawer={() => setIsTakesDrawerOpen(true)}
        onOpenTranscribeModal={() => setIsTranscribeModalOpen(true)}
        autoTranscribeEnabled={settings.autoTranscribe}
        cameraActive={cameraActive}
        micActive={micActive}
      />

      {/* Center Studio Canvas Viewport */}
      <main className="flex-1 flex flex-col relative">
        <ReactionStudioStage
          canvasRef={canvasRef}
          sourceVideoRef={sourceVideoRef}
          cameraVideoRef={cameraVideoRef}
          selectedVideo={selectedVideo}
          onOpenVideoSelector={() => setIsSourceSelectorOpen(true)}
          onOpenSetupModal={() => setIsSetupModalOpen(true)}
          onOpenTranscribeModal={() => setIsTranscribeModalOpen(true)}
          isRecording={isRecording}
          isPaused={isPaused}
          recordingSeconds={recordingSeconds}
          isSourceVideoHidden={isPaused && settings.autoHideVideoOnPause}
          isCountingDown={isCountingDown}
          countdownValue={countdownValue}
          settings={settings}
          onUpdateSettings={updateSettings}
          onCycleFlashlight={cycleFlashlight}
          floatingReactions={floatingReactions}
          cameraActive={cameraActive}
          cameraError={cameraError}
          onStartCamera={() => startCamera()}
          onSwitchCameraFacing={switchCameraFacing}
        />

        {/* Bottom Studio Controls & Transport */}
        <StudioControls
          isRecording={isRecording}
          isPaused={isPaused}
          recordingSeconds={recordingSeconds}
          isCountingDown={isCountingDown}
          countdownValue={countdownValue}
          onStartRecording={handleStartRecording}
          onPauseRecording={handlePauseRecording}
          onResumeRecording={handleResumeRecording}
          onStopRecording={handleStopRecording}
          onResetSourceVideo={handleResetSourceVideo}
          settings={settings}
          onUpdateSettings={updateSettings}
          cameraActive={cameraActive}
          onToggleCamera={toggleCamera}
          onSwitchCameraFacing={switchCameraFacing}
          onCycleFlashlight={cycleFlashlight}
          onOpenTranscribeModal={() => setIsTranscribeModalOpen(true)}
          micActive={micActive}
          onToggleMic={toggleMic}
          onTriggerEmoji={triggerReaction}
          sourceAudioLevel={sourceAudioLevel}
          micAudioLevel={micAudioLevel}
        />
      </main>

      {/* Canvas Setup Modal: Prompts 16:9 vs 9:16 and Main Canvas Feed (Camera or Video) */}
      <CanvasSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        settings={settings}
        onApplySetup={updateSettings}
      />

      {/* Source Video Selection Modal */}
      <SourceVideoSelector
        isOpen={isSourceSelectorOpen}
        onClose={() => setIsSourceSelectorOpen(false)}
        selectedVideo={selectedVideo}
        onSelectVideo={(v) => {
          setSelectedVideo(v);
          if (sourceVideoRef.current) {
            sourceVideoRef.current.currentTime = 0;
          }
        }}
      />

      {/* Soundboard & Live Reactions Drawer */}
      <SoundboardDrawer
        isOpen={isSoundboardOpen}
        onClose={() => setIsSoundboardOpen(false)}
        onTriggerReaction={triggerReaction}
        sfxVolume={settings.sfxVolume}
        onVolumeChange={(v) => updateSettings({ sfxVolume: v })}
      />

      {/* Layout & Styling Customizer Modal */}
      <LayoutCustomizerModal
        isOpen={isLayoutCustomizerOpen}
        onClose={() => setIsLayoutCustomizerOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />

      {/* Takes History Drawer */}
      <TakesHistoryDrawer
        isOpen={isTakesDrawerOpen}
        onClose={() => setIsTakesDrawerOpen(false)}
        takes={takes}
        onSelectTake={(take) => {
          setActiveTake(take);
          setIsPlaybackModalOpen(true);
        }}
        onDeleteTake={deleteTake}
      />

      {/* Playback & Video Export Modal */}
      <PlaybackExportModal
        isOpen={isPlaybackModalOpen}
        onClose={() => setIsPlaybackModalOpen(false)}
        take={activeTake}
        onSaveToGallery={(take) => {
          if (!takes.some((t) => t.id === take.id)) {
            setTakes((prev) => [take, ...prev]);
          }
        }}
        onRetake={() => {
          handleResetSourceVideo();
          handleStartRecording();
        }}
      />

      {/* Auto Transcribe & Live Subtitles Modal */}
      <TranscribeModal
        isOpen={isTranscribeModalOpen}
        onClose={() => setIsTranscribeModalOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />
    </div>
  );
}
