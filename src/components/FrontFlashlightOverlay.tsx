import React from 'react';
import { FlashlightMode, FrontFlashTone } from '../types';
import { Sun, Sparkles, X, Zap } from 'lucide-react';

interface FrontFlashlightOverlayProps {
  flashlightMode: FlashlightMode;
  brightness: number; // 0.2 to 1.0
  tone: FrontFlashTone;
  onUpdateBrightness: (b: number) => void;
  onUpdateTone: (t: FrontFlashTone) => void;
  onTurnOff: () => void;
}

export const FrontFlashlightOverlay: React.FC<FrontFlashlightOverlayProps> = ({
  flashlightMode,
  brightness,
  tone,
  onUpdateBrightness,
  onUpdateTone,
  onTurnOff,
}) => {
  const isFrontActive = flashlightMode === 'front' || flashlightMode === 'both';
  const isBackActive = flashlightMode === 'back' || flashlightMode === 'both';

  if (!isFrontActive && !isBackActive) return null;

  // Tone styles for screen softbox illumination
  const getToneStyle = () => {
    switch (tone) {
      case 'warm':
        return {
          bg: '#fff7ed', // orange-50
          glow: 'rgba(254, 215, 170, 0.95)',
          colorName: 'Warm Amber (3200K)',
        };
      case 'golden':
        return {
          bg: '#fefce8', // yellow-50
          glow: 'rgba(253, 224, 71, 0.95)',
          colorName: 'Golden Hour (4500K)',
        };
      case 'soft-pink':
        return {
          bg: '#fff1f2', // rose-50
          glow: 'rgba(254, 205, 211, 0.95)',
          colorName: 'Soft Rose Beauty',
        };
      case 'daylight':
      default:
        return {
          bg: '#ffffff',
          glow: 'rgba(255, 255, 255, 0.98)',
          colorName: 'Studio Daylight (6500K)',
        };
    }
  };

  const toneConfig = getToneStyle();

  return (
    <>
      {/* Front Screen Light Softbox Frame: Emits high-intensity diffuse light towards the presenter */}
      {isFrontActive && (
        <div
          className="pointer-events-none fixed inset-0 z-40 transition-opacity duration-300"
          style={{
            opacity: brightness,
            boxShadow: `inset 0 0 120px 45px ${toneConfig.glow}, inset 0 0 40px 15px #ffffff`,
            border: `14px solid ${toneConfig.bg}`,
          }}
        />
      )}

      {/* Floating Flashlight Status & Quick Adjustment Pill */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-950/90 backdrop-blur-md border border-amber-500/40 text-xs font-semibold shadow-2xl animate-fadeIn">
        <div className="flex items-center gap-1.5 text-amber-400">
          {flashlightMode === 'both' ? (
            <>
              <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
              <span className="text-white font-bold">Dual Flashlight (Front + Back)</span>
            </>
          ) : flashlightMode === 'front' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '8s' }} />
              <span className="text-white font-bold">Front Screen Flash</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-white font-bold">Back LED Flash</span>
            </>
          )}
        </div>

        {/* Tone and Brightness adjustment if Front flash is on */}
        {isFrontActive && (
          <div className="flex items-center gap-2 pl-2 border-l border-neutral-700">
            {/* Tone Selector */}
            <div className="flex items-center gap-1">
              {[
                { id: 'daylight' as FrontFlashTone, label: 'Daylight', color: 'bg-white' },
                { id: 'warm' as FrontFlashTone, label: 'Warm', color: 'bg-amber-200' },
                { id: 'golden' as FrontFlashTone, label: 'Gold', color: 'bg-yellow-300' },
                { id: 'soft-pink' as FrontFlashTone, label: 'Rose', color: 'bg-rose-200' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onUpdateTone(t.id)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    tone === t.id
                      ? 'bg-amber-500 text-black'
                      : 'bg-neutral-800 text-neutral-300 hover:text-white'
                  }`}
                  title={t.label}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Brightness Slider */}
            <div className="flex items-center gap-1 text-[11px] text-neutral-300">
              <span className="hidden sm:inline">Bright:</span>
              <input
                type="range"
                min="0.3"
                max="1.0"
                step="0.05"
                value={brightness}
                onChange={(e) => onUpdateBrightness(parseFloat(e.target.value))}
                className="w-16 accent-amber-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                title={`Brightness: ${Math.round(brightness * 100)}%`}
              />
              <span className="font-mono text-[10px]">{Math.round(brightness * 100)}%</span>
            </div>
          </div>
        )}

        {/* Turn Off Button */}
        <button
          type="button"
          onClick={onTurnOff}
          className="ml-1 p-1 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
          title="Turn Flashlight Off"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </>
  );
};
