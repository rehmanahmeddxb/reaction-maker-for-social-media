import React from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  FlipHorizontal,
  Volume2,
  Sliders,
  Sparkles,
  Layout,
  Columns,
  Rows,
  Smartphone,
  SwitchCamera,
  Subtitles,
} from 'lucide-react';
import { LayoutMode, StudioSettings } from '../types';
import { REACTION_EMOJIS } from '../utils/sampleVideos';
import { FlashlightControlMenu } from './FlashlightControlMenu';

interface StudioControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  recordingSeconds?: number;
  isCountingDown: boolean;
  countdownValue: number;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStopRecording: () => void;
  onResetSourceVideo: () => void;
  settings: StudioSettings;
  onUpdateSettings: (s: Partial<StudioSettings>) => void;
  cameraActive: boolean;
  onToggleCamera: () => void;
  onSwitchCameraFacing?: () => void;
  onCycleFlashlight?: () => void;
  onOpenTranscribeModal?: () => void;
  micActive: boolean;
  onToggleMic: () => void;
  onTriggerEmoji: (emoji: string, soundKey?: string) => void;
  sourceAudioLevel: number;
  micAudioLevel: number;
}

const LAYOUT_OPTIONS: { id: LayoutMode; name: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'pip-bottom-right', name: 'PiP (Bottom R)', icon: Layout },
  { id: 'pip-bottom-left', name: 'PiP (Bottom L)', icon: Layout },
  { id: 'pip-top-right', name: 'PiP (Top R)', icon: Layout },
  { id: 'split-side-by-side', name: 'Split (50/50)', icon: Columns },
  { id: 'split-top-bottom', name: 'Split (Top/Bottom)', icon: Rows },
  { id: 'stacked-shorts', name: 'Shorts Stack', icon: Smartphone },
];

export const StudioControls: React.FC<StudioControlsProps> = ({
  isRecording,
  isPaused,
  recordingSeconds = 0,
  isCountingDown,
  countdownValue,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onResetSourceVideo,
  settings,
  onUpdateSettings,
  cameraActive,
  onToggleCamera,
  onSwitchCameraFacing,
  onCycleFlashlight,
  onOpenTranscribeModal,
  micActive,
  onToggleMic,
  onTriggerEmoji,
  sourceAudioLevel,
  micAudioLevel,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  return (
    <div className="bg-neutral-900 border-t border-neutral-800 p-4 sm:p-5 space-y-4">
      {/* Top Bar: Primary Recording Transport & Layout Presets */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Layout Switcher Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs font-bold text-neutral-400 mr-1 uppercase tracking-wider hidden xl:inline-block">
            Layout:
          </span>
          {LAYOUT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = settings.layout === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateSettings({ layout: opt.id })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white border border-neutral-700/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.name}</span>
              </button>
            );
          })}
        </div>

        {/* Primary Record Controls */}
        <div className="flex items-center gap-2.5">
          {!isRecording ? (
            <button
              id="btn-start-recording"
              type="button"
              disabled={isCountingDown}
              onClick={onStartRecording}
              className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition cursor-pointer transform active:scale-95 ${
                isCountingDown
                  ? 'bg-amber-500 shadow-amber-500/30'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/35 ring-2 ring-rose-500/40'
              }`}
            >
              {isCountingDown ? (
                <>
                  <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                  <span>Starting in {countdownValue}...</span>
                </>
              ) : (
                <>
                  <span className="w-3.5 h-3.5 rounded-full bg-white animate-pulse" />
                  <span>START REACTION</span>
                </>
              )}
            </button>
          ) : (
            <>
              {/* Studio Recording Timer Display (Prominently visible in UI without being burned into export) */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-950 border border-red-500/40 shadow-inner">
                <span className={`w-2.5 h-2.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-red-500 animate-pulse'}`} />
                <span className="font-mono text-xs font-bold text-white tracking-wider">
                  {formatTime(recordingSeconds)}
                </span>
                <span className="text-[10px] font-bold text-red-400 uppercase">
                  {isPaused ? 'Paused' : 'Live'}
                </span>
              </div>

              {/* Pause / Resume */}
              <button
                id="btn-pause-recording"
                type="button"
                onClick={isPaused ? onResumeRecording : onPauseRecording}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition cursor-pointer"
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              {/* Stop & Merge Video */}
              <button
                id="btn-stop-recording"
                type="button"
                onClick={onStopRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Finish & Export Take</span>
              </button>
            </>
          )}

          {/* Reset Source video seeking */}
          <button
            type="button"
            onClick={onResetSourceVideo}
            className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700 transition cursor-pointer"
            title="Reset video to 0:00"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Bar: Live Audio Levels & Video Input Hardware Switches & Quick Reaction Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-neutral-800/60 items-center">
        {/* Audio Faders & VU Levels */}
        <div className="flex items-center gap-4 text-xs">
          {/* Source Audio */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-medium">
              <span>Source Video Vol</span>
              <span className="font-mono text-neutral-300">
                {Math.round(settings.sourceVolume * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sourceVolume}
                onChange={(e) =>
                  onUpdateSettings({ sourceVolume: parseFloat(e.target.value) })
                }
                className="w-full accent-rose-500 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Mic Audio */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-medium">
              <span className="flex items-center gap-1">
                Mic Voice
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block transition"
                  style={{
                    backgroundColor: micActive
                      ? `rgba(16, 185, 129, ${0.4 + micAudioLevel * 0.6})`
                      : '#71717a',
                  }}
                />
              </span>
              <span className="font-mono text-neutral-300">
                {Math.round(settings.micVolume * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.micVolume}
                onChange={(e) =>
                  onUpdateSettings({ micVolume: parseFloat(e.target.value) })
                }
                className="w-full accent-emerald-500 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Hardware Devices Switchers */}
        <div className="flex items-center justify-center flex-wrap gap-2">
          {/* Camera On/Off Toggle */}
          <button
            type="button"
            onClick={onToggleCamera}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              cameraActive
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
            }`}
            title={cameraActive ? 'Using Real Webcam' : 'Using Demo Avatar'}
          >
            {cameraActive ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
            <span>{cameraActive ? 'Webcam Live' : 'Demo Avatar'}</span>
          </button>

          {/* Front / Back Switch Camera */}
          {cameraActive && onSwitchCameraFacing && (
            <button
              type="button"
              onClick={onSwitchCameraFacing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25"
              title={`Switch camera front/back (Currently: ${settings.cameraFacingMode === 'user' ? 'Front / Selfie' : 'Back / Environment'})`}
            >
              <SwitchCamera className="w-3.5 h-3.5" />
              <span>{settings.cameraFacingMode === 'user' ? 'Front Cam' : 'Back Cam'}</span>
            </button>
          )}

          {/* Flashlight Function: On / Off / Front / Back / Both */}
          <FlashlightControlMenu
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onCycleFlashlight={onCycleFlashlight}
            onSwitchCameraFacing={onSwitchCameraFacing}
          />

          {/* Mic On/Off Toggle */}
          <button
            type="button"
            onClick={onToggleMic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              micActive
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
            }`}
            title={micActive ? 'Microphone enabled' : 'Microphone muted'}
          >
            {micActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span>{micActive ? 'Mic On' : 'Mic Mute'}</span>
          </button>

          {/* Auto Transcribe Subtitles trigger */}
          {onOpenTranscribeModal && (
            <button
              type="button"
              onClick={onOpenTranscribeModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                settings.autoTranscribe
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
              }`}
              title="Live speech-to-text subtitles configuration"
            >
              <Subtitles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Subtitles</span>
              {settings.autoTranscribe && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          )}

          {/* Mirror Flip */}
          <button
            type="button"
            onClick={() => onUpdateSettings({ mirrorCamera: !settings.mirrorCamera })}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              settings.mirrorCamera
                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
            }`}
            title="Mirror Camera Horizontally"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Flip</span>
          </button>
        </div>

        {/* Quick Reaction Emoji Pills */}
        <div className="flex items-center justify-end gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider hidden lg:inline-block mr-1">
            React:
          </span>
          {REACTION_EMOJIS.slice(0, 6).map((r, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onTriggerEmoji(r.emoji, r.soundKey)}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/60 hover:scale-110 active:scale-95 transition cursor-pointer text-base"
              title={`${r.label} (Burst into video)`}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
