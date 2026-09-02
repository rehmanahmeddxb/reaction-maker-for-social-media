import React from 'react';
import {
  X,
  Sliders,
  Sparkles,
  Layout,
  Circle,
  Square,
  Type,
  Eye,
  Palette,
  Maximize2,
  Smartphone,
  Tv,
  Instagram,
  Camera,
  Film,
  RotateCcw,
  Move,
  Flashlight,
  Sun,
  Clock,
} from 'lucide-react';
import { StudioSettings, LayoutMode, CameraShape, AspectRatio, VideoFilter, MainFeedRole, PipRectRatio, FrontFlashTone } from '../types';

interface LayoutCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StudioSettings;
  onUpdateSettings: (newSettings: Partial<StudioSettings>) => void;
}

const COLOR_PRESETS = [
  { name: 'Rose Red', hex: '#f43f5e' },
  { name: 'Cyan Neon', hex: '#06b6d4' },
  { name: 'Electric Purple', hex: '#a855f7' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Emerald Glow', hex: '#10b981' },
  { name: 'Pure White', hex: '#ffffff' },
];

const FILTER_PRESETS: { id: VideoFilter; name: string }[] = [
  { id: 'none', name: 'Normal (Raw)' },
  { id: 'vibrant', name: 'Vibrant Boost' },
  { id: 'warm', name: 'Warm Cozy' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon' },
  { id: 'vintage', name: 'Retro Vintage' },
  { id: 'grayscale', name: 'Dramatic B&W' },
];

export const LayoutCustomizerModal: React.FC<LayoutCustomizerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-['Outfit']">
                Studio Layout & PiP Customizer
              </h2>
              <p className="text-xs text-neutral-400">
                Format presets, fullscreen feed role, draggable corner box, and neon accents
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* 1. Target Video Aspect Ratio */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
              1. Canvas Dimensions (Aspect Ratio)
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => onUpdateSettings({ aspectRatio: '16:9' })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition cursor-pointer ${
                  settings.aspectRatio === '16:9'
                    ? 'border-rose-500 bg-rose-500/10 text-white ring-1 ring-rose-500'
                    : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Tv className="w-5 h-5 text-rose-400" />
                <span className="font-semibold text-xs">16:9 Landscape</span>
                <span className="text-[10px] text-neutral-500">YouTube / Desktop</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ aspectRatio: '9:16' })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition cursor-pointer ${
                  settings.aspectRatio === '9:16'
                    ? 'border-rose-500 bg-rose-500/10 text-white ring-1 ring-rose-500'
                    : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Smartphone className="w-5 h-5 text-rose-400" />
                <span className="font-semibold text-xs">9:16 Vertical</span>
                <span className="text-[10px] text-neutral-500">Shorts / TikTok / Reels</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ aspectRatio: '1:1' })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition cursor-pointer ${
                  settings.aspectRatio === '1:1'
                    ? 'border-rose-500 bg-rose-500/10 text-white ring-1 ring-rose-500'
                    : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Instagram className="w-5 h-5 text-rose-400" />
                <span className="font-semibold text-xs">1:1 Square</span>
                <span className="text-[10px] text-neutral-500">Instagram Feed</span>
              </button>
            </div>
          </div>

          {/* 2. Main Fullscreen Background Feed Role */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
              2. Main Fullscreen Canvas Feed
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onUpdateSettings({ mainFeed: 'camera' })}
                className={`p-3.5 rounded-xl border flex items-center gap-3 text-left transition cursor-pointer ${
                  settings.mainFeed === 'camera'
                    ? 'border-indigo-500 bg-indigo-500/15 text-white ring-1 ring-indigo-500'
                    : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">Camera as Fullscreen</h4>
                  <p className="text-[10px] text-neutral-400">Target clip is inside PiP box</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ mainFeed: 'video' })}
                className={`p-3.5 rounded-xl border flex items-center gap-3 text-left transition cursor-pointer ${
                  settings.mainFeed === 'video'
                    ? 'border-rose-500 bg-rose-500/15 text-white ring-1 ring-rose-500'
                    : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">Video as Fullscreen</h4>
                  <p className="text-[10px] text-neutral-400">Camera is inside PiP box</p>
                </div>
              </button>
            </div>
          </div>

          {/* 3. PiP Corner Shape & Rect/Square Adjuster */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
              3. PiP Frame Shape
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { id: 'rectangle' as CameraShape, name: 'Rectangle', icon: Layout },
                { id: 'square' as CameraShape, name: 'Square Corner', icon: Square },
                { id: 'rounded-rect' as CameraShape, name: 'Rounded Card', icon: Layout },
                { id: 'circle' as CameraShape, name: 'Circle Bubble', icon: Circle },
              ].map((s) => {
                const Icon = s.icon;
                const isSel = settings.cameraShape === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const cornerRad =
                        s.id === 'square' ? 0 : s.id === 'rectangle' ? 8 : 20;
                      onUpdateSettings({
                        cameraShape: s.id,
                        pipCornerRadius: cornerRad,
                      });
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      isSel
                        ? 'border-indigo-500 bg-indigo-500/15 text-white ring-1 ring-indigo-500'
                        : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-medium">{s.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. PiP Size & Corner Radius Sliders */}
          <div className="space-y-4 p-4 rounded-xl bg-neutral-950/40 border border-neutral-800">
            {/* Scale */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300">PiP Scale Size:</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="1"
                  value={settings.pipSizePercent}
                  onChange={(e) =>
                    onUpdateSettings({ pipSizePercent: parseInt(e.target.value) })
                  }
                  className="w-36 accent-rose-500 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                />
                <span className="font-mono text-xs text-rose-400 w-9 text-right font-bold">
                  {settings.pipSizePercent}%
                </span>
              </div>
            </div>

            {/* Corner Radius */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300">Corner Radius (Roundness):</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="36"
                  step="2"
                  value={settings.pipCornerRadius ?? 8}
                  onChange={(e) =>
                    onUpdateSettings({ pipCornerRadius: parseInt(e.target.value) })
                  }
                  className="w-36 accent-indigo-500 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                />
                <span className="font-mono text-xs text-indigo-400 w-9 text-right font-bold">
                  {settings.pipCornerRadius ?? 8}px
                </span>
              </div>
            </div>

            {/* Border Thickness */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300">Border Thickness:</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  value={settings.pipBorderWidth}
                  onChange={(e) =>
                    onUpdateSettings({ pipBorderWidth: parseInt(e.target.value) })
                  }
                  className="w-36 accent-indigo-500 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                />
                <span className="font-mono text-xs text-indigo-400 w-9 text-right font-bold">
                  {settings.pipBorderWidth}px
                </span>
              </div>
            </div>

            {/* Reset Drag Position to Corner */}
            <div className="pt-2 flex items-center justify-between border-t border-neutral-800/80">
              <span className="text-xs text-neutral-400">Position Reset:</span>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    layout: 'pip-bottom-right',
                    isCustomPipPosition: false,
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Snap to Bottom-Right Corner</span>
              </button>
            </div>

            {/* Border Color Presets */}
            <div>
              <span className="block text-xs font-semibold text-neutral-300 mb-2">
                Accent / Border Color:
              </span>
              <div className="flex flex-wrap items-center gap-3">
                {COLOR_PRESETS.map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => onUpdateSettings({ pipBorderColor: col.hex })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                      settings.pipBorderColor === col.hex
                        ? 'border-white bg-neutral-800 text-white'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span>{col.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Glow & Shadow Toggles */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.pipGlow}
                  onChange={(e) => onUpdateSettings({ pipGlow: e.target.checked })}
                  className="accent-rose-500 w-4 h-4 rounded"
                />
                <span className="text-xs font-medium text-neutral-300">Neon Ambient Glow</span>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.pipShadow}
                  onChange={(e) => onUpdateSettings({ pipShadow: e.target.checked })}
                  className="accent-indigo-500 w-4 h-4 rounded"
                />
                <span className="text-xs font-medium text-neutral-300">Drop Shadow Depth</span>
              </label>
            </div>
          </div>

          {/* Video Filter Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
              5. Video Color Grade / Filter
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {FILTER_PRESETS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onUpdateSettings({ filter: f.id })}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                    settings.filter === f.id
                      ? 'border-rose-500 bg-rose-500/15 text-white'
                      : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Export Cleanliness & Flashlight Settings */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
              6. Export Video Cleanliness & Flashlight
            </label>
            <div className="space-y-3">
              {/* Clean Export Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-900 border border-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showWatermark ?? false}
                    onChange={(e) => onUpdateSettings({ showWatermark: e.target.checked })}
                    className="accent-rose-500 w-4 h-4 rounded mt-0.5"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-neutral-200">
                      'Reaction Studio' Text / Watermark
                    </span>
                    <span className="block text-[10px] text-neutral-400 mt-0.5">
                      {settings.showWatermark ? 'Visible in export' : 'Disabled (Clean export without brand text)'}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-900 border border-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showTimerBadgeOnCanvas ?? false}
                    onChange={(e) => onUpdateSettings({ showTimerBadgeOnCanvas: e.target.checked })}
                    className="accent-rose-500 w-4 h-4 rounded mt-0.5"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-neutral-200">
                      Burn Timer Seconds on Video
                    </span>
                    <span className="block text-[10px] text-neutral-400 mt-0.5">
                      {settings.showTimerBadgeOnCanvas ? 'Burned into video' : 'Disabled (Clean export - timer stays on studio controls)'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Flashlight Tone Preset */}
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                    <Flashlight className="w-4 h-4 text-amber-400" />
                    <span>Front Screen Flashlight Tone</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">Softbox Lighting</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['daylight', 'warm', 'pure-white'] as FrontFlashTone[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onUpdateSettings({ frontFlashTone: t })}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition capitalize cursor-pointer ${
                        (settings.frontFlashTone || 'daylight') === t
                          ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      {t.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/25 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
