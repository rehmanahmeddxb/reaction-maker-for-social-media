import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Maximize,
  Film,
  Sparkles,
  Camera,
  Layers,
  Move,
  Maximize2,
  Minimize2,
  RotateCcw,
  Square,
  Layout,
  Circle,
  Sliders,
  Tv,
  Smartphone,
  ArrowLeftRight,
  CornerDownRight,
  CornerDownLeft,
  CornerUpRight,
  CornerUpLeft,
  Upload,
  Subtitles,
  Eye,
  EyeOff,
  Play,
  Pause,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { SourceVideo, StudioSettings, FloatingReaction, CameraShape, PipRectRatio, FrontFlashTone } from '../types';
import { calculatePipRect, getCanvasDimensions } from '../utils/canvasCompositor';
import { FlashlightControlMenu } from './FlashlightControlMenu';
import { FrontFlashlightOverlay } from './FrontFlashlightOverlay';

interface ReactionStudioStageProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  sourceVideoRef: React.RefObject<HTMLVideoElement | null>;
  cameraVideoRef: React.RefObject<HTMLVideoElement | null>;
  selectedVideo: SourceVideo | null;
  onOpenVideoSelector: () => void;
  onOpenSetupModal: () => void;
  onOpenTranscribeModal?: () => void;
  isRecording: boolean;
  isPaused: boolean;
  recordingSeconds?: number;
  isSourceVideoHidden?: boolean;
  isCountingDown: boolean;
  countdownValue: number;
  settings: StudioSettings;
  onUpdateSettings: (updates: Partial<StudioSettings>) => void;
  onCycleFlashlight?: () => void;
  floatingReactions: FloatingReaction[];
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  cameraActive?: boolean;
  cameraError?: string | null;
  onStartCamera?: () => void;
  onSwitchCameraFacing?: () => void;
}

export const ReactionStudioStage: React.FC<ReactionStudioStageProps> = ({
  canvasRef,
  sourceVideoRef,
  cameraVideoRef,
  selectedVideo,
  onOpenVideoSelector,
  onOpenSetupModal,
  onOpenTranscribeModal,
  isRecording,
  isPaused,
  recordingSeconds = 0,
  isSourceVideoHidden = false,
  isCountingDown,
  countdownValue,
  settings,
  onUpdateSettings,
  onCycleFlashlight,
  floatingReactions,
  isEditMode: isEditModeProp,
  onToggleEditMode,
  cameraActive = false,
  cameraError = null,
  onStartCamera,
  onSwitchCameraFacing,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageViewportRef = useRef<HTMLDivElement>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  // Edit Mode state (active by default when not recording)
  const [internalEditMode, setInternalEditMode] = useState(true);
  const activeEditMode = !isRecording && (isEditModeProp !== undefined ? isEditModeProp : internalEditMode);

  const toggleEditMode = () => {
    if (onToggleEditMode) {
      onToggleEditMode();
    } else {
      setInternalEditMode((prev) => !prev);
    }
  };

  // Preview play/pause for rehearsal
  const toggleSourcePreview = async () => {
    const vid = sourceVideoRef.current;
    if (!vid) return;
    if (vid.paused) {
      try {
        await vid.play();
        setIsPreviewPlaying(true);
      } catch (e) {
        console.warn('Source preview play error:', e);
      }
    } else {
      vid.pause();
      setIsPreviewPlaying(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPosRef = useRef<{ startX: number; startY: number; initCustomX: number; initCustomY: number }>({
    startX: 0,
    startY: 0,
    initCustomX: settings.pipCustomX,
    initCustomY: settings.pipCustomY,
  });

  // Resizing State
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    centerX: number;
    centerY: number;
    initDist: number;
    initSizePercent: number;
    corner: 'br' | 'tl' | 'tr' | 'bl';
  }>({
    startX: 0,
    startY: 0,
    centerX: 0,
    centerY: 0,
    initDist: 0,
    initSizePercent: settings.pipSizePercent,
    corner: 'br',
  });

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Canvas aspect ratio CSS wrapper
  const getAspectRatioStyle = () => {
    switch (settings.aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-h-[72vh] max-w-[420px]';
      case '1:1':
        return 'aspect-square max-h-[66vh] max-w-[580px]';
      case '16:9':
      default:
        return 'aspect-video max-h-[66vh] max-w-[960px]';
    }
  };

  // Dimensions of the virtual canvas coordinate space
  const canvasDims = getCanvasDimensions(settings.aspectRatio);
  const pipRect = calculatePipRect(settings, canvasDims.width, canvasDims.height);

  // Calculate percentage coordinates for the interactive DOM overlay
  const pipLeftPercent = (pipRect.x / canvasDims.width) * 100;
  const pipTopPercent = (pipRect.y / canvasDims.height) * 100;
  const pipWidthPercent = (pipRect.width / canvasDims.width) * 100;
  const pipHeightPercent = (pipRect.height / canvasDims.height) * 100;

  // Handle Dragging of PiP frame
  const handlePointerDownDrag = (e: React.PointerEvent) => {
    if (isRecording) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);

    const viewport = stageViewportRef.current;
    if (!viewport) return;

    dragStartPosRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initCustomX: settings.pipCustomX,
      initCustomY: settings.pipCustomY,
    };
  };

  const handlePointerMoveDrag = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const viewport = stageViewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const deltaX = e.clientX - dragStartPosRef.current.startX;
    const deltaY = e.clientY - dragStartPosRef.current.startY;

    // Available travel space in DOM pixels
    const pipPixelW = (pipWidthPercent / 100) * rect.width;
    const pipPixelH = (pipHeightPercent / 100) * rect.height;
    const travelW = Math.max(1, rect.width - pipPixelW);
    const travelH = Math.max(1, rect.height - pipPixelH);

    const deltaPercentX = (deltaX / travelW) * 100;
    const deltaPercentY = (deltaY / travelH) * 100;

    const newX = Math.max(0, Math.min(100, dragStartPosRef.current.initCustomX + deltaPercentX));
    const newY = Math.max(0, Math.min(100, dragStartPosRef.current.initCustomY + deltaPercentY));

    onUpdateSettings({
      pipCustomX: Math.round(newX),
      pipCustomY: Math.round(newY),
      isCustomPipPosition: true,
      layout: 'pip-custom',
    });
  };

  const handlePointerUpDrag = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Handle Corner Resize Handle Drag
  const handlePointerDownResize = (e: React.PointerEvent, corner: 'br' | 'tl' | 'tr' | 'bl' = 'br') => {
    e.stopPropagation();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsResizing(true);

    const viewport = stageViewportRef.current;
    if (!viewport) return;

    const viewportRect = viewport.getBoundingClientRect();
    const pipPixelW = (pipWidthPercent / 100) * viewportRect.width;
    const pipPixelH = (pipHeightPercent / 100) * viewportRect.height;
    const pipCenterX = viewportRect.left + (pipLeftPercent / 100) * viewportRect.width + pipPixelW / 2;
    const pipCenterY = viewportRect.top + (pipTopPercent / 100) * viewportRect.height + pipPixelH / 2;

    const initDist = Math.hypot(e.clientX - pipCenterX, e.clientY - pipCenterY);

    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      centerX: pipCenterX,
      centerY: pipCenterY,
      initDist: Math.max(20, initDist),
      initSizePercent: settings.pipSizePercent,
      corner,
    };
  };

  const handlePointerMoveResize = (e: React.PointerEvent) => {
    if (!isResizing) return;
    const { centerX, centerY, initDist, initSizePercent } = resizeStartRef.current;

    const currentDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
    const ratio = currentDist / initDist;
    const newSize = Math.max(15, Math.min(65, Math.round(initSizePercent * ratio)));

    if (newSize !== settings.pipSizePercent) {
      onUpdateSettings({ pipSizePercent: newSize });
    }
  };

  const handlePointerUpResize = (e: React.PointerEvent) => {
    if (isResizing) {
      setIsResizing(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Quick Corner Snap
  const snapToCorner = (corner: 'tl' | 'tr' | 'bl' | 'br' | 'center') => {
    switch (corner) {
      case 'tl':
        onUpdateSettings({ layout: 'pip-top-left', isCustomPipPosition: false });
        break;
      case 'tr':
        onUpdateSettings({ layout: 'pip-top-right', isCustomPipPosition: false });
        break;
      case 'bl':
        onUpdateSettings({ layout: 'pip-bottom-left', isCustomPipPosition: false });
        break;
      case 'br':
        onUpdateSettings({ layout: 'pip-bottom-right', isCustomPipPosition: false });
        break;
      case 'center':
        onUpdateSettings({
          layout: 'pip-custom',
          isCustomPipPosition: true,
          pipCustomX: 50,
          pipCustomY: 50,
        });
        break;
    }
  };

  // Swap Main Background vs PiP Role
  const toggleMainFeedRole = () => {
    onUpdateSettings({
      mainFeed: settings.mainFeed === 'camera' ? 'video' : 'camera',
    });
  };

  const isPipMode =
    settings.layout === 'pip-custom' ||
    settings.layout.startsWith('pip-') ||
    settings.isCustomPipPosition;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex flex-col items-center justify-center p-2 sm:p-4 bg-neutral-950/70 overflow-hidden"
    >
      {/* Off-screen video elements actively decoding for the 60fps Canvas Compositor */}
      {/* Note: NEVER use display:none because browsers suspend frame decoding for hidden elements! */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none opacity-0 overflow-hidden"
        style={{
          top: -9999,
          left: -9999,
          width: 320,
          height: 240,
          zIndex: -999,
        }}
      >
        <video
          ref={sourceVideoRef}
          playsInline
          preload="auto"
          style={{ width: 320, height: 240 }}
        />
        <video
          ref={cameraVideoRef}
          playsInline
          autoPlay
          muted
          style={{ width: 320, height: 240 }}
        />
      </div>

      {/* Top Floating Stage Bar: Canvas Setup & PiP Quick Controls */}
      <div className="w-full max-w-4xl mb-2 px-2 flex flex-wrap items-center justify-between gap-2 z-20">
        {/* Left: Setup & Format Badges */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-open-canvas-setup"
            onClick={onOpenSetupModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-200 transition shadow-sm cursor-pointer"
            title="Configure Canvas Format & Fullscreen Feed"
          >
            <Sliders className="w-3.5 h-3.5 text-rose-400" />
            <span>Format: <strong className="text-white">{settings.aspectRatio}</strong></span>
          </button>

          <button
            type="button"
            id="btn-swap-main-pip-role"
            onClick={toggleMainFeedRole}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-200 transition shadow-sm cursor-pointer"
            title="Swap which feed is Fullscreen Main vs PiP Frame"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline text-neutral-400">Main:</span>
            <span className="font-bold text-white capitalize">
              {settings.mainFeed === 'camera' ? '🎥 Camera' : '🎬 Video'}
            </span>
          </button>

          {/* Subtitles & Transcribe Quick Toggle */}
          {onOpenTranscribeModal && (
            <button
              type="button"
              id="btn-quick-subtitles-modal"
              onClick={onOpenTranscribeModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition shadow-sm cursor-pointer ${
                settings.autoTranscribe
                  ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/30'
                  : 'bg-neutral-900/90 border-neutral-700 text-neutral-400 hover:text-white'
              }`}
              title="Auto Live Speech Transcribing & Bilingual Subtitles"
            >
              <Subtitles className="w-3.5 h-3.5 text-indigo-400" />
              <span>CC: {settings.autoTranscribe ? (settings.transcriptionBilingual ? 'Dual' : 'Single') : 'Off'}</span>
            </button>
          )}

          {/* Quick Flashlight Selector */}
          <FlashlightControlMenu
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onCycleFlashlight={onCycleFlashlight}
            compact
          />

          {/* Video Paused Hide Indicator */}
          {isPaused && isSourceVideoHidden && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold animate-pulse">
              <EyeOff className="w-3 h-3" />
              <span>Video Hidden (Paused)</span>
            </div>
          )}
        </div>

        {/* Right: Draggable PiP Shape & Snapping controls */}
        {isPipMode && (
          <div className="flex items-center gap-1.5 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800 shadow-sm">
            <span className="text-[11px] font-bold text-neutral-400 px-2 uppercase tracking-wider hidden md:inline">
              PiP Shape:
            </span>

            {/* Rectangle 16:9 */}
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  cameraShape: 'rectangle',
                  pipRectRatio: '16:9',
                  pipCornerRadius: 8,
                })
              }
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                settings.cameraShape === 'rectangle'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Rectangle Corner (16:9 Widescreen)"
            >
              <Layout className="w-3 h-3" />
              <span>Rectangle</span>
            </button>

            {/* Square 1:1 */}
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  cameraShape: 'square',
                  pipRectRatio: '1:1',
                  pipCornerRadius: 0,
                })
              }
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                settings.cameraShape === 'square'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Sharp Square Corner (1:1)"
            >
              <Square className="w-3 h-3" />
              <span>Square</span>
            </button>

            {/* Rounded Card */}
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  cameraShape: 'rounded-rect',
                  pipRectRatio: '16:9',
                  pipCornerRadius: 20,
                })
              }
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                settings.cameraShape === 'rounded-rect'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Rounded Corner Card"
            >
              <Layout className="w-3 h-3" />
              <span>Card</span>
            </button>

            {/* Circle */}
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  cameraShape: 'circle',
                  pipRectRatio: '1:1',
                })
              }
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                settings.cameraShape === 'circle'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Circle Bubble"
            >
              <Circle className="w-3 h-3" />
            </button>

            {/* Visual Edit Mode Toggle Button */}
            <div className="h-4 w-px bg-neutral-800 mx-0.5 hidden sm:block" />
            <button
              type="button"
              id="btn-toggle-pip-edit-mode"
              onClick={toggleEditMode}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeEditMode
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
                  : 'text-neutral-400 hover:text-white border border-transparent'
              }`}
              title="Toggle Visual Drag & Corner Resize Edit Mode for PiP Frame"
            >
              <Move className="w-3 h-3 text-rose-400" />
              <span>Edit PiP: <strong className="text-white font-bold">{activeEditMode ? 'ON' : 'OFF'}</strong></span>
            </button>
          </div>
        )}
      </div>

      {/* Main Studio Viewport Card */}
      <div
        ref={stageViewportRef}
        className={`relative w-full ${getAspectRatioStyle()} rounded-2xl overflow-hidden bg-black border border-neutral-800 shadow-2xl flex items-center justify-center group`}
      >
        {/* The Live Composite High-Performance Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain block select-none pointer-events-none"
        />

        {/* Draggable & Scalable PiP Interactive Bounding Box (Active in PiP modes) */}
        {isPipMode && (
          <div
            onPointerDown={handlePointerDownDrag}
            onPointerMove={handlePointerMoveDrag}
            onPointerUp={handlePointerUpDrag}
            className={`absolute z-20 cursor-move select-none transition-shadow touch-none ${
              isDragging
                ? 'ring-2 ring-rose-500/90 shadow-2xl scale-[1.01]'
                : activeEditMode
                ? 'ring-2 ring-rose-500/70 shadow-xl'
                : 'hover:ring-1 hover:ring-rose-400/50'
            }`}
            style={{
              left: `${pipLeftPercent}%`,
              top: `${pipTopPercent}%`,
              width: `${pipWidthPercent}%`,
              height: `${pipHeightPercent}%`,
              borderRadius:
                settings.cameraShape === 'circle'
                  ? '9999px'
                  : settings.cameraShape === 'square'
                  ? `${settings.pipCornerRadius || 0}px`
                  : `${settings.pipCornerRadius || 12}px`,
            }}
          >
            {/* Visual Handles & Controls when in Edit Mode */}
            {activeEditMode && (
              <div
                className={`absolute inset-0 border-2 border-dashed rounded-[inherit] pointer-events-none transition-all ${
                  isDragging
                    ? 'border-rose-400 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                    : isResizing
                    ? 'border-rose-300 bg-rose-500/10 shadow-[0_0_25px_rgba(244,63,94,0.4)]'
                    : 'border-rose-400/85 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                }`}
              >
                {/* Top Header inside PiP Frame */}
                <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-auto z-20">
                  {/* Feed Role & Drag Label */}
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-neutral-950/85 text-white backdrop-blur-xs flex items-center gap-1 shadow border border-neutral-800">
                    {settings.mainFeed === 'video' ? (
                      <>
                        <Camera className="w-3 h-3 text-rose-400" />
                        <span>Camera PiP</span>
                      </>
                    ) : (
                      <>
                        <Film className="w-3 h-3 text-indigo-400" />
                        <span>Video PiP</span>
                      </>
                    )}
                    <span className="text-neutral-500">•</span>
                    <Move className="w-2.5 h-2.5 text-neutral-400" />
                    <span className="text-[9px] text-neutral-300 font-normal">Move</span>
                  </span>

                  {/* Corner Snap Quick Buttons */}
                  <div className="flex items-center gap-0.5 bg-neutral-950/85 p-0.5 rounded-md backdrop-blur-xs border border-neutral-800 shadow">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        snapToCorner('tl');
                      }}
                      className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition cursor-pointer"
                      title="Snap Top-Left"
                    >
                      <CornerUpLeft className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        snapToCorner('tr');
                      }}
                      className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition cursor-pointer"
                      title="Snap Top-Right"
                    >
                      <CornerUpRight className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        snapToCorner('bl');
                      }}
                      className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition cursor-pointer"
                      title="Snap Bottom-Left"
                    >
                      <CornerDownLeft className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        snapToCorner('br');
                      }}
                      className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition cursor-pointer"
                      title="Snap Bottom-Right"
                    >
                      <CornerDownRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                {/* Bottom Bar: Scale Tag */}
                <div className="absolute bottom-1.5 left-2 pointer-events-auto z-20">
                  <span className="px-1.5 py-0.5 rounded-md bg-neutral-950/85 backdrop-blur-xs font-mono text-[10px] text-white border border-neutral-800 shadow flex items-center gap-1">
                    <span className="text-neutral-400">Scale:</span>
                    <strong className="text-rose-400">{settings.pipSizePercent}%</strong>
                  </span>
                </div>

                {/* PRIMARY VISUAL CORNER RESIZE HANDLE (Bottom-Right) */}
                <div
                  id="pip-resize-handle-br"
                  onPointerDown={(e) => handlePointerDownResize(e, 'br')}
                  onPointerMove={handlePointerMoveResize}
                  onPointerUp={handlePointerUpResize}
                  className="absolute bottom-1 right-1 z-30 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white border-2 border-white shadow-2xl cursor-nwse-resize pointer-events-auto select-none touch-none transition-transform hover:scale-110 active:scale-95 ring-4 ring-rose-500/30 hover:ring-rose-500/60 group/handle"
                  title="Drag corner to resize camera PiP frame"
                >
                  <Maximize2 className="w-3.5 h-3.5 rotate-90 text-white" />
                  {/* Floating tooltip on hover */}
                  <span className="hidden sm:group-hover/handle:flex items-center gap-1 absolute bottom-full right-0 mb-1.5 px-2 py-0.5 rounded-md bg-neutral-950/95 text-white text-[10px] font-semibold whitespace-nowrap shadow-xl border border-neutral-700 pointer-events-none">
                    <span>Resize PiP</span>
                    <span className="text-rose-400 font-mono">({settings.pipSizePercent}%)</span>
                  </span>
                </div>

                {/* SECONDARY VISUAL CORNER RESIZE HANDLE (Top-Left - ideal when PiP is in bottom-right corner) */}
                <div
                  id="pip-resize-handle-tl"
                  onPointerDown={(e) => handlePointerDownResize(e, 'tl')}
                  onPointerMove={handlePointerMoveResize}
                  onPointerUp={handlePointerUpResize}
                  className="absolute top-1 left-1 z-30 flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-neutral-900/90 hover:bg-rose-600 text-white border-2 border-neutral-400 hover:border-white shadow-lg cursor-nwse-resize pointer-events-auto select-none touch-none transition-transform hover:scale-110 active:scale-95 group/tlhandle"
                  title="Drag corner to resize camera PiP frame"
                >
                  <Maximize2 className="w-3 h-3 text-white" />
                  <span className="hidden sm:group-hover/tlhandle:flex items-center gap-1 absolute top-full left-0 mt-1.5 px-2 py-0.5 rounded-md bg-neutral-950/95 text-white text-[10px] font-semibold whitespace-nowrap shadow-xl border border-neutral-700 pointer-events-none">
                    <span>Resize PiP</span>
                    <span className="text-rose-400 font-mono">({settings.pipSizePercent}%)</span>
                  </span>
                </div>

                {/* Subtle visual corner grips on other corners */}
                <div
                  id="pip-resize-handle-tr"
                  onPointerDown={(e) => handlePointerDownResize(e, 'tr')}
                  onPointerMove={handlePointerMoveResize}
                  onPointerUp={handlePointerUpResize}
                  className="absolute top-1 right-1 z-20 w-4 h-4 rounded-full bg-neutral-900/80 hover:bg-rose-600 border border-neutral-400 hover:border-white text-white flex items-center justify-center cursor-nesw-resize pointer-events-auto select-none touch-none transition hover:scale-125"
                  title="Resize from top-right corner"
                />
                <div
                  id="pip-resize-handle-bl"
                  onPointerDown={(e) => handlePointerDownResize(e, 'bl')}
                  onPointerMove={handlePointerMoveResize}
                  onPointerUp={handlePointerUpResize}
                  className="absolute bottom-1 left-1 z-20 w-4 h-4 rounded-full bg-neutral-900/80 hover:bg-rose-600 border border-neutral-400 hover:border-white text-white flex items-center justify-center cursor-nesw-resize pointer-events-auto select-none touch-none transition hover:scale-125"
                  title="Resize from bottom-left corner"
                />

                {/* Active Resizing HUD Overlay */}
                {isResizing && (
                  <div className="absolute inset-0 bg-black/75 backdrop-blur-xs rounded-[inherit] flex flex-col items-center justify-center text-white pointer-events-none animate-fadeIn z-40">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white shadow-2xl border border-white/30">
                      <Maximize2 className="w-4 h-4 animate-pulse" />
                      <span className="font-mono text-sm font-bold">{settings.pipSizePercent}%</span>
                    </div>
                    <span className="text-[10px] text-neutral-300 mt-1 font-semibold tracking-wide">
                      Drag corner to scale • 15% - 65%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Source Video Header Overlay (When idle) */}
        {!isRecording && selectedVideo && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 z-20 transition shadow-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
                <Film className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white truncate font-['Outfit']">
                    {selectedVideo.title}
                  </h3>
                  {selectedVideo.resolution && (
                    <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-[9px] font-mono text-neutral-300 border border-neutral-700">
                      {selectedVideo.resolution}
                    </span>
                  )}
                  {selectedVideo.isCustom && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 text-[9px] font-bold text-emerald-400 border border-emerald-700/60">
                      Local File
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-neutral-400">
                  {selectedVideo.category} {selectedVideo.duration ? `• ${Math.floor(selectedVideo.duration / 60)}:${(selectedVideo.duration % 60).toString().padStart(2, '0')}` : ''}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleSourcePreview}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold transition cursor-pointer shadow-sm"
                title={isPreviewPlaying ? 'Pause video preview' : 'Play video preview to test clip'}
              >
                {isPreviewPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-white" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Preview Clip</span>
                  </>
                )}
              </button>
              <button
                onClick={onOpenVideoSelector}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition cursor-pointer"
              >
                Change Clip
              </button>
            </div>
          </div>
        )}

        {/* Empty Video Prompt CTA (When no video is chosen) */}
        {!isRecording && !selectedVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-sm z-15 text-center">
            <div className="p-3 rounded-2xl bg-neutral-900/90 border border-neutral-700/80 text-rose-400 mb-3 shadow-xl">
              <Film className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Video Loaded Yet</h3>
            <p className="text-xs text-neutral-400 max-w-xs mb-4">
              Select a sample clip or upload your own MP4, WebM, or MOV video from your device.
            </p>
            <button
              type="button"
              onClick={onOpenVideoSelector}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Choose or Upload Video</span>
            </button>
          </div>
        )}

        {/* Camera Offline Warning / Prompt (When camera stream is not live) */}
        {!isRecording && !cameraActive && onStartCamera && (
          <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/95 border border-amber-500/40 text-xs shadow-xl backdrop-blur-md">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-amber-200 text-[11px]">
              {cameraError ? cameraError : 'Webcam Offline'}
            </span>
            <button
              type="button"
              onClick={onStartCamera}
              className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition cursor-pointer shrink-0"
            >
              Start Camera
            </button>
          </div>
        )}

        {/* 3-2-1 Recording Countdown Overlay */}
        {isCountingDown && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex flex-col items-center justify-center animate-fadeIn">
            <div className="relative flex items-center justify-center">
              <div className="w-36 h-36 rounded-full border-4 border-rose-500/40 border-t-rose-500 animate-spin" />
              <span className="absolute text-7xl font-black text-white font-['Outfit'] animate-scaleUp">
                {countdownValue}
              </span>
            </div>
            <p className="mt-5 text-base font-bold text-rose-400 uppercase tracking-widest animate-pulse">
              Get Ready to React!
            </p>
          </div>
        )}

        {/* Floating Emojis Animation on DOM stage */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {floatingReactions.map((r) => {
            const elapsed = Date.now() - r.timestamp;
            if (elapsed > 2000) return null;
            return (
              <div
                key={r.id}
                className="absolute text-4xl transform -translate-x-1/2 -translate-y-1/2 animate-floatUp drop-shadow-xl"
                style={{
                  left: `${(r.x / (canvasRef.current?.width || 1920)) * 100}%`,
                  top: `${(r.y / (canvasRef.current?.height || 1080)) * 100}%`,
                }}
              >
                {r.emoji}
              </div>
            );
          })}
        </div>

        {/* Floating Recording Timer HUD (Visible on stage preview only - NEVER burned into the exported canvas video) */}
        {isRecording && (
          <div className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-rose-500/50 shadow-xl font-mono text-xs font-bold text-white animate-fadeIn pointer-events-none">
            <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-rose-400">{isPaused ? 'PAUSED' : 'REC'}</span>
            <span className="tracking-wider text-white">{formatTime(recordingSeconds)}</span>
          </div>
        )}

        {/* Front Screen Light Softbox Overlay (Active when front or both flashlight is turned on) */}
        <FrontFlashlightOverlay
          flashlightMode={settings.flashlightMode}
          brightness={settings.frontFlashBrightness || 0.9}
          tone={settings.frontFlashTone || 'daylight'}
          onUpdateBrightness={(b) => onUpdateSettings({ frontFlashBrightness: b })}
          onUpdateTone={(t) => onUpdateSettings({ frontFlashTone: t })}
          onTurnOff={() => onUpdateSettings({ flashlightMode: 'off' })}
        />

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 opacity-0 group-hover:opacity-100 transition z-10 cursor-pointer"
          title="Toggle Fullscreen Preview"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
