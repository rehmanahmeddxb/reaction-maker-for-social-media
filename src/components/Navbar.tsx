import React from 'react';
import {
  Video,
  Radio,
  Sliders,
  Sparkles,
  Film,
  Camera,
  Layers,
  Volume2,
  Tv,
  Smartphone,
  LayoutGrid,
  Subtitles,
  Languages,
} from 'lucide-react';
import { AspectRatio, LayoutMode, MainFeedRole } from '../types';

interface NavbarProps {
  isRecording: boolean;
  isPaused: boolean;
  recordingSeconds: number;
  takesCount: number;
  aspectRatio: AspectRatio;
  mainFeed: MainFeedRole;
  onOpenSetupModal: () => void;
  onOpenVideoSelector: () => void;
  onOpenSoundboard: () => void;
  onOpenLayoutCustomizer: () => void;
  onOpenTakesDrawer: () => void;
  onOpenTranscribeModal: () => void;
  autoTranscribeEnabled?: boolean;
  cameraActive: boolean;
  micActive: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  isRecording,
  isPaused,
  recordingSeconds,
  takesCount,
  aspectRatio,
  mainFeed,
  onOpenSetupModal,
  onOpenVideoSelector,
  onOpenSoundboard,
  onOpenLayoutCustomizer,
  onOpenTakesDrawer,
  onOpenTranscribeModal,
  autoTranscribeEnabled = false,
  cameraActive,
  micActive,
}) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="h-16 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white font-['Outfit'] tracking-tight">
                Reaction<span className="text-rose-500 font-extrabold">Studio</span>
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                PRO MAKER
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-medium hidden md:block">
              Dual-Stream Reaction Video Recording & PiP Mixer
            </p>
          </div>
        </div>

        {/* Live Recording Indicator */}
        {isRecording && (
          <div className="ml-2 flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-xs font-mono font-bold tracking-wider">
              {isPaused ? 'PAUSED' : 'REC'} {formatTime(recordingSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* Center Setup & Format Trigger Badge */}
      <div className="hidden lg:flex items-center gap-2">
        <button
          type="button"
          id="btn-nav-canvas-setup"
          onClick={onOpenSetupModal}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 border border-neutral-700 text-xs text-neutral-200 transition cursor-pointer"
          title="Change Canvas Format (16:9 / 9:16) & Main Background"
        >
          {aspectRatio === '9:16' ? (
            <Smartphone className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Tv className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span>Format: <strong className="text-white">{aspectRatio}</strong></span>
          <span className="text-neutral-500">|</span>
          <span className="text-neutral-300">
            Main: <strong className="text-rose-400 capitalize">{mainFeed}</strong>
          </span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-800/60 border border-neutral-700/60 text-xs text-neutral-400">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-400' : 'bg-amber-400'}`}
            />
            <span className="text-neutral-300">
              {cameraActive ? 'Webcam Live' : 'Demo Avatar'}
            </span>
          </div>
          <span className="text-neutral-600">•</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${micActive ? 'bg-emerald-400' : 'bg-neutral-500'}`}
            />
            <span className="text-neutral-300">{micActive ? 'Mic On' : 'Mic Off'}</span>
          </div>
        </div>
      </div>

      {/* Action Navigation Buttons */}
      <div className="flex items-center gap-2">
        {/* Canvas Setup Button for small/medium screens */}
        <button
          id="btn-nav-format-setup"
          onClick={onOpenSetupModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-gradient-to-r from-rose-600/20 to-indigo-600/20 hover:from-rose-600/30 hover:to-indigo-600/30 text-white border border-rose-500/30 transition cursor-pointer"
          title="Format & Canvas Setup (16:9 or 9:16)"
        >
          <LayoutGrid className="w-4 h-4 text-rose-400" />
          <span className="hidden sm:inline">Canvas Setup</span>
        </button>

        <button
          id="btn-nav-choose-video"
          onClick={onOpenVideoSelector}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition cursor-pointer"
          title="Choose or Upload Source Video"
        >
          <Video className="w-4 h-4 text-rose-400" />
          <span className="hidden sm:inline">Source Video</span>
        </button>

        <button
          id="btn-nav-transcribe"
          onClick={onOpenTranscribeModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border transition cursor-pointer ${
            autoTranscribeEnabled
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30'
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
          }`}
          title="Auto Live Speech Transcribing & Bilingual Subtitles"
        >
          <Subtitles className={`w-4 h-4 ${autoTranscribeEnabled ? 'text-indigo-400' : 'text-neutral-400'}`} />
          <span className="hidden sm:inline">Subtitles</span>
          {autoTranscribeEnabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          )}
        </button>

        <button
          id="btn-nav-soundboard"
          onClick={onOpenSoundboard}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition cursor-pointer"
          title="Soundboard & Reactions"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Soundboard</span>
        </button>

        <button
          id="btn-nav-layout-customize"
          onClick={onOpenLayoutCustomizer}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition cursor-pointer"
          title="Customize PiP & Layout"
        >
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span className="hidden sm:inline">Styling</span>
        </button>

        <button
          id="btn-nav-my-takes"
          onClick={onOpenTakesDrawer}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition cursor-pointer relative"
          title="View Recorded Takes"
        >
          <Film className="w-4 h-4 text-rose-400" />
          <span className="hidden sm:inline">Takes</span>
          {takesCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {takesCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
