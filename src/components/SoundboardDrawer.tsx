import React from 'react';
import {
  X,
  Volume2,
  Sparkles,
  Zap,
  Flame,
  Laugh,
  Award,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { SOUND_EFFECTS, REACTION_EMOJIS } from '../utils/sampleVideos';
import { audioEngine } from '../utils/audioSynthesizer';

interface SoundboardDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerReaction: (emoji: string, soundKey?: string) => void;
  sfxVolume: number;
  onVolumeChange: (vol: number) => void;
}

export const SoundboardDrawer: React.FC<SoundboardDrawerProps> = ({
  isOpen,
  onClose,
  onTriggerReaction,
  sfxVolume,
  onVolumeChange,
}) => {
  if (!isOpen) return null;

  const playSfx = (soundKey: string) => {
    audioEngine.playSound(soundKey, sfxVolume);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-neutral-900/95 border-l border-neutral-800 shadow-2xl z-40 flex flex-col backdrop-blur-xl animate-slideLeft">
      {/* Drawer Header */}
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-white font-['Outfit']">Reaction Soundboard</h2>
            <p className="text-xs text-neutral-400">
              Trigger instant meme sounds & live on-canvas emojis
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* SFX Volume Slider */}
      <div className="px-4 py-3 border-b border-neutral-800/80 bg-neutral-950/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
          <Volume2 className="w-4 h-4 text-amber-400" />
          <span>SFX Gain:</span>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-[180px]">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={sfxVolume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onVolumeChange(val);
              audioEngine.setSfxVolume(val);
            }}
            className="w-full accent-amber-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
          />
          <span className="text-xs font-mono text-neutral-400 w-8 text-right">
            {Math.round(sfxVolume * 100)}%
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Floating Emoji Reactions Bar */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold tracking-wider uppercase text-neutral-400">
              Live Animated Emojis (Click to Pop)
            </span>
            <span className="text-[11px] text-neutral-500">Renders into video</span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {REACTION_EMOJIS.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  onTriggerReaction(r.emoji, r.soundKey);
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-700/80 border border-neutral-700/50 hover:border-amber-500/50 hover:scale-105 active:scale-95 transition cursor-pointer group"
                title={`${r.label} (Trigger emoji + sound)`}
              >
                <span className="text-2xl group-hover:scale-125 transition duration-150">
                  {r.emoji}
                </span>
                <span className="text-[10px] font-semibold text-neutral-400 group-hover:text-amber-300 mt-1 truncate w-full text-center">
                  {r.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Meme Sound Effects Pad */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold tracking-wider uppercase text-neutral-400">
              Meme & Dramatic FX Pads
            </span>
            <span className="text-[11px] text-amber-400 font-mono">Zero Latency WebAudio</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {SOUND_EFFECTS.map((sfx) => {
              return (
                <button
                  key={sfx.id}
                  onClick={() => playSfx(sfx.soundKey)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/80 hover:bg-amber-500/15 border border-neutral-700/60 hover:border-amber-500/40 text-left transition active:scale-98 cursor-pointer group"
                >
                  <div className="text-xl shrink-0 p-2 rounded-lg bg-neutral-900 group-hover:bg-amber-500/20 group-hover:text-amber-300 transition">
                    {sfx.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-neutral-200 group-hover:text-amber-300 truncate">
                      {sfx.name}
                    </h4>
                    <span className="text-[10px] uppercase font-semibold text-neutral-500 tracking-wider">
                      {sfx.category}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Creator Tips */}
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-neutral-300 text-xs leading-relaxed space-y-1">
          <p className="font-semibold text-rose-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Synchronized Audio Recording
          </p>
          <p className="text-neutral-400 text-[11px]">
            Every emoji and sound effect clicked during recording is recorded directly into the output audio & video file!
          </p>
        </div>
      </div>
    </div>
  );
};
