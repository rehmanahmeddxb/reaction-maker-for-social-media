import React, { useState } from 'react';
import {
  Tv,
  Smartphone,
  Instagram,
  Camera,
  Film,
  Sparkles,
  Check,
  X,
  Square,
  Layout,
  Circle,
  Move,
  Sliders,
  Subtitles,
  Languages,
  EyeOff,
} from 'lucide-react';
import { AspectRatio, MainFeedRole, CameraShape, PipRectRatio, StudioSettings } from '../types';
import { SUPPORTED_LANGUAGES } from '../utils/transcriptionService';

interface CanvasSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StudioSettings;
  onApplySetup: (updates: Partial<StudioSettings>) => void;
}

export const CanvasSetupModal: React.FC<CanvasSetupModalProps> = ({
  isOpen,
  onClose,
  settings,
  onApplySetup,
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(settings.aspectRatio || '16:9');
  const [mainFeed, setMainFeed] = useState<MainFeedRole>(settings.mainFeed || 'camera');
  const [pipShape, setPipShape] = useState<CameraShape>(settings.cameraShape || 'rectangle');
  const [pipRatio, setPipRatio] = useState<PipRectRatio>(settings.pipRectRatio || '16:9');
  const [autoTranscribe, setAutoTranscribe] = useState<boolean>(settings.autoTranscribe ?? true);
  const [transcriptionBilingual, setTranscriptionBilingual] = useState<boolean>(settings.transcriptionBilingual ?? true);
  const [transcriptionPrimaryLang, setTranscriptionPrimaryLang] = useState<string>(settings.transcriptionPrimaryLang || 'en-US');
  const [autoHideVideoOnPause, setAutoHideVideoOnPause] = useState<boolean>(settings.autoHideVideoOnPause ?? true);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplySetup({
      aspectRatio,
      mainFeed,
      cameraShape: pipShape,
      pipRectRatio: pipRatio,
      layout: 'pip-bottom-right',
      pipSizePercent: pipShape === 'rectangle' ? 32 : 28,
      pipCornerRadius: pipShape === 'square' ? 0 : pipShape === 'rectangle' ? 8 : 16,
      autoTranscribe,
      transcriptionBilingual,
      transcriptionPrimaryLang,
      autoHideVideoOnPause,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-indigo-500/20 text-rose-400 border border-rose-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-['Outfit']">
                Studio Canvas & Layout Setup
              </h2>
              <p className="text-xs text-neutral-400">
                Choose your canvas ratio, fullscreen background feed, and draggable PiP style
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* 1. Main Canvas Aspect Ratio */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center text-[10px] font-mono">
                  1
                </span>
                Canvas Dimensions & Ratio
              </label>
              <span className="text-[11px] text-neutral-400">Where will you post this video?</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* 16:9 */}
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={`p-4 rounded-xl border flex flex-col items-center text-center transition cursor-pointer relative ${
                  aspectRatio === '16:9'
                    ? 'border-rose-500 bg-rose-500/10 text-white ring-2 ring-rose-500/30'
                    : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                }`}
              >
                <div className="w-12 h-7 rounded border border-current flex items-center justify-center mb-2">
                  <Tv className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-white">16:9 Fullscreen</span>
                <span className="text-[11px] text-neutral-400 mt-0.5">YouTube / PC Display</span>
                {aspectRatio === '16:9' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </button>

              {/* 9:16 */}
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`p-4 rounded-xl border flex flex-col items-center text-center transition cursor-pointer relative ${
                  aspectRatio === '9:16'
                    ? 'border-rose-500 bg-rose-500/10 text-white ring-2 ring-rose-500/30'
                    : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                }`}
              >
                <div className="w-7 h-11 rounded border border-current flex items-center justify-center mb-1.5">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-white">9:16 Vertical</span>
                <span className="text-[11px] text-neutral-400 mt-0.5">Shorts / TikTok / Reels</span>
                {aspectRatio === '9:16' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </button>

              {/* 1:1 */}
              <button
                type="button"
                onClick={() => setAspectRatio('1:1')}
                className={`p-4 rounded-xl border flex flex-col items-center text-center transition cursor-pointer relative ${
                  aspectRatio === '1:1'
                    ? 'border-rose-500 bg-rose-500/10 text-white ring-2 ring-rose-500/30'
                    : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                }`}
              >
                <div className="w-9 h-9 rounded border border-current flex items-center justify-center mb-2">
                  <Instagram className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-white">1:1 Square</span>
                <span className="text-[11px] text-neutral-400 mt-0.5">Social Feed Post</span>
                {aspectRatio === '1:1' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* 2. Main Fullscreen Background vs PiP Feed */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center text-[10px] font-mono">
                  2
                </span>
                What is the Fullscreen Main Background?
              </label>
              <span className="text-[11px] text-neutral-400">The other feed goes into PiP</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Option A: Camera is Fullscreen, Video is PiP */}
              <div
                onClick={() => setMainFeed('camera')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between relative ${
                  mainFeed === 'camera'
                    ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30'
                    : 'border-neutral-800 bg-neutral-800/30 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Full Camera Background</h3>
                    <p className="text-xs text-neutral-300 mt-1">
                      Your webcam is full screen. The reaction video clip floats inside a scalable,
                      draggable picture-in-picture box!
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-neutral-800 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Main: Webcam</span>
                  <span className="font-semibold text-indigo-400">PiP: Reaction Clip</span>
                </div>

                {mainFeed === 'camera' && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>

              {/* Option B: Video is Fullscreen, Camera is PiP */}
              <div
                onClick={() => setMainFeed('video')}
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between relative ${
                  mainFeed === 'video'
                    ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30'
                    : 'border-neutral-800 bg-neutral-800/30 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-300 shrink-0">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Full Video Background</h3>
                    <p className="text-xs text-neutral-300 mt-1">
                      The video clip fills the entire canvas background. Your webcam floats inside
                      the draggable, resizable PiP frame.
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-neutral-800 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Main: Video Clip</span>
                  <span className="font-semibold text-rose-400">PiP: Webcam Facecam</span>
                </div>

                {mainFeed === 'video' && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Scalable PiP Frame Shape */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center text-[10px] font-mono">
                  3
                </span>
                PiP Corner Box Shape
              </label>
              <span className="text-[11px] text-neutral-400">Draggable & resizable anytime</span>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {[
                {
                  id: 'rectangle' as CameraShape,
                  name: 'Rectangle (16:9)',
                  icon: Layout,
                  desc: 'Cinema widescreen',
                },
                {
                  id: 'square' as CameraShape,
                  name: 'Square (1:1)',
                  icon: Square,
                  desc: 'Sharp square corner',
                },
                {
                  id: 'rounded-rect' as CameraShape,
                  name: 'Rounded Card',
                  icon: Layout,
                  desc: 'Modern rounded card',
                },
                {
                  id: 'circle' as CameraShape,
                  name: 'Circle Bubble',
                  icon: Circle,
                  desc: 'Avatar bubble',
                },
              ].map((s) => {
                const Icon = s.icon;
                const isSelected = pipShape === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPipShape(s.id)}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 transition cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/15 text-white ring-1 ring-indigo-500'
                        : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold">{s.name}</span>
                    <span className="text-[10px] text-neutral-500 line-clamp-1">{s.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Live Audio Transcribing & Video Auto-Hide */}
          <div className="pt-2 border-t border-neutral-800 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center text-[10px] font-mono">
                4
              </span>
              Speech Transcribing & Reaction Flow
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Transcribe Toggle */}
              <div className="p-3.5 rounded-xl bg-neutral-800/40 border border-neutral-800 flex items-center justify-between">
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Subtitles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Live Speech Subtitles</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Auto-transcribe reaction speech onto canvas
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={autoTranscribe}
                    onChange={(e) => setAutoTranscribe(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                </label>
              </div>

              {/* Bilingual Subtitle Toggle */}
              <div className="p-3.5 rounded-xl bg-neutral-800/40 border border-neutral-800 flex items-center justify-between">
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Languages className="w-3.5 h-3.5 text-rose-400" />
                    <span>Bilingual Subtitles</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Dual line (English + Chinese translation)
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={transcriptionBilingual}
                    onChange={(e) => setTranscriptionBilingual(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                </label>
              </div>
            </div>

            {/* Auto-Hide Video On Pause Toggle */}
            <div className="p-3.5 rounded-xl bg-neutral-800/40 border border-neutral-800 flex items-center justify-between">
              <div className="space-y-0.5 pr-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Auto-Hide Local Video on Pause</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  When paused, local video hides magically; resuming ensures first frame pre-loads before smooth playback.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={autoHideVideoOnPause}
                  onChange={(e) => setAutoHideVideoOnPause(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Move className="w-4 h-4 text-rose-400" />
            <span>PiP frame can be dragged & resized directly on the canvas</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-apply-canvas-setup"
              onClick={handleApply}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Apply & Launch Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
