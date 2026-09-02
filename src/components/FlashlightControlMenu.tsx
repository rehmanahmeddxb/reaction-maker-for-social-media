import React, { useState, useRef, useEffect } from 'react';
import { FlashlightMode, FrontFlashTone, StudioSettings } from '../types';
import { Sun, Zap, Sparkles, ChevronDown, Check, Lightbulb, Smartphone, AlertCircle, RefreshCw } from 'lucide-react';

interface FlashlightControlMenuProps {
  settings: StudioSettings;
  onUpdateSettings: (updates: Partial<StudioSettings>) => void;
  onCycleFlashlight?: () => void;
  compact?: boolean;
  onSwitchCameraFacing?: (facing?: 'user' | 'environment') => void;
}

export const FlashlightControlMenu: React.FC<FlashlightControlMenuProps> = ({
  settings,
  onUpdateSettings,
  onCycleFlashlight,
  compact = false,
  onSwitchCameraFacing,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentMode = settings.flashlightMode || 'off';
  const isActive = currentMode !== 'off';

  const modes: Array<{
    id: FlashlightMode;
    label: string;
    sub: string;
    icon: any;
    badge: string;
    color: string;
  }> = [
    {
      id: 'off',
      label: 'Flash Off',
      sub: 'Disabled',
      icon: Sun,
      badge: 'OFF',
      color: 'text-neutral-400',
    },
    {
      id: 'front',
      label: 'Front Flash',
      sub: 'Screen Ring / Softbox light for face reactions',
      icon: Sun,
      badge: 'FRONT',
      color: 'text-amber-300',
    },
    {
      id: 'back',
      label: 'Back Flash',
      sub: 'Hardware LED torch for rear / environment camera',
      icon: Zap,
      badge: 'BACK',
      color: 'text-yellow-400',
    },
    {
      id: 'both',
      label: 'Both (Front + Back)',
      sub: 'Dual light: Screen softbox + Back LED torch simultaneously',
      icon: Sparkles,
      badge: 'BOTH',
      color: 'text-orange-400',
    },
  ];

  const getButtonText = () => {
    switch (currentMode) {
      case 'front':
        return 'Front Flash';
      case 'back':
        return 'Back Flash';
      case 'both':
        return 'Dual Flash (Both)';
      case 'off':
      default:
        return 'Flash: Off';
    }
  };

  const getButtonIcon = () => {
    switch (currentMode) {
      case 'both':
        return Sparkles;
      case 'back':
        return Zap;
      case 'front':
        return Sun;
      default:
        return Lightbulb;
    }
  };

  const IconComponent = getButtonIcon();

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* Main Flash Button with Dual-Click Capability:
          Clicking text/icon cycles modes, clicking arrow opens full selection menu */}
      <div
        className={`flex items-center rounded-xl border text-xs font-semibold transition shadow-sm ${
          isActive
            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 ring-1 ring-amber-500/30'
            : 'bg-neutral-800/90 hover:bg-neutral-700/80 border-neutral-700 text-neutral-300 hover:text-white'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (onCycleFlashlight) {
              onCycleFlashlight();
            } else {
              // Cycle off -> front -> back -> both -> off
              const order: FlashlightMode[] = ['off', 'front', 'back', 'both'];
              const next = order[(order.indexOf(currentMode) + 1) % order.length];
              onUpdateSettings({ flashlightMode: next });
            }
          }}
          className={`flex items-center gap-1.5 py-1.5 cursor-pointer ${
            compact ? 'px-2' : 'px-2.5'
          }`}
          title={`Flashlight Mode: ${getButtonText()} (Click to cycle Off/Front/Back/Both)`}
        >
          <IconComponent
            className={`w-3.5 h-3.5 ${
              isActive ? 'text-amber-400 animate-pulse' : 'text-neutral-400'
            }`}
          />
          <span className="capitalize">{getButtonText()}</span>
          {isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping ml-0.5" />
          )}
        </button>

        {/* Dropdown Chevron toggle */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-1.5 py-1.5 border-l border-neutral-700/60 hover:bg-white/10 text-neutral-400 hover:text-white transition cursor-pointer"
          title="Choose Flashlight Mode: Front, Back, Both, or Off"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Popover Selection Menu */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 sm:right-0 sm:left-auto w-72 p-2.5 rounded-2xl bg-neutral-900 border border-neutral-700 shadow-2xl z-50 animate-fadeIn text-left">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              Flashlight Control
            </span>
            <span className="text-[10px] text-neutral-400 font-medium">Front • Back • Both</span>
          </div>

          <div className="space-y-1.5">
            {modes.map((m) => {
              const MIcon = m.icon;
              const isSelected = currentMode === m.id;
              const isBackFlash = m.id === 'back';
              const needsFlipToRear = isBackFlash && settings.cameraFacingMode === 'user';

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ flashlightMode: m.id });
                    if (isBackFlash && needsFlipToRear && onSwitchCameraFacing) {
                      onSwitchCameraFacing('environment');
                    }
                    setIsOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl border flex items-start justify-between gap-2.5 transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/50 text-white ring-1 ring-amber-500/30'
                      : 'bg-neutral-800/40 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        isSelected ? 'bg-amber-500/20 text-amber-300' : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      <MIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{m.label}</span>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                            isSelected ? 'bg-amber-500 text-black' : 'bg-neutral-700 text-neutral-300'
                          }`}
                        >
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5 leading-tight">{m.sub}</p>
                      {needsFlipToRear && (
                        <p className="text-[10px] text-amber-300 font-semibold mt-1 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} />
                          Flips to rear camera to power physical LED
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>

          {/* Device Hardware Info Card */}
          <div className="mt-2.5 pt-2 border-t border-neutral-800/80 px-1 text-[10px] text-neutral-400 flex items-start gap-1.5 leading-tight">
            <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-neutral-300">Hardware Torch Note:</p>
              <p className="text-neutral-400 mt-0.5">
                Physical LED flash is located on <strong>mobile rear cameras</strong>.
                Laptops and front selfie cameras do not have LED flash bulbs.
              </p>
            </div>
          </div>

          {/* Quick Tone & Brightness for Front / Both */}
          {(currentMode === 'front' || currentMode === 'both') && (
            <div className="mt-2.5 pt-2.5 border-t border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span>Front Light Tone:</span>
                <span className="text-amber-300 font-semibold capitalize">
                  {settings.frontFlashTone}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(['daylight', 'warm', 'golden', 'soft-pink'] as FrontFlashTone[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onUpdateSettings({ frontFlashTone: t })}
                    className={`py-1 rounded-lg text-[10px] font-bold capitalize transition cursor-pointer ${
                      settings.frontFlashTone === t
                        ? 'bg-amber-500 text-black'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    {t.replace('-', ' ')}
                  </button>
                ))}
              </div>

              {/* Brightness slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>Front Softbox Brightness:</span>
                  <span className="font-mono text-white">
                    {Math.round((settings.frontFlashBrightness || 0.9) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.05"
                  value={settings.frontFlashBrightness || 0.9}
                  onChange={(e) =>
                    onUpdateSettings({ frontFlashBrightness: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* One-click Disable Screen Glow button */}
              <button
                type="button"
                onClick={() => onUpdateSettings({ flashlightMode: 'off' })}
                className="w-full py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] font-semibold transition cursor-pointer"
              >
                Turn Off Screen Glow
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
