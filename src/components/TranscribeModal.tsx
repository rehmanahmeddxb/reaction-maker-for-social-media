import React from 'react';
import {
  X,
  Languages,
  Check,
  Subtitles,
  Sparkles,
  Eye,
  EyeOff,
  Layers,
  Volume2,
  Mic,
  Info,
} from 'lucide-react';
import { StudioSettings } from '../types';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../utils/transcriptionService';

interface TranscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StudioSettings;
  onUpdateSettings: (newSettings: Partial<StudioSettings>) => void;
}

export const TranscribeModal: React.FC<TranscribeModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const currentPrimary = settings.transcriptionPrimaryLang || 'en-US';
  const currentSecondary = settings.transcriptionSecondaryLang || 'zh-CN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-rose-500/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2">
                <span>Live Audio Transcribing & Subtitles</span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI Speech
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Auto-transcribe reaction commentary with single or dual/bilingual subtitles
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
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Toggle: Enable Auto Transcribe */}
          <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Subtitles className="w-4 h-4 text-rose-400" />
                <span className="text-sm font-bold text-white">
                  Real-time Camera Audio Transcriber
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Listens to your microphone during the reaction and burns dynamic high-contrast subtitles into the canvas
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoTranscribe}
                onChange={(e) => onUpdateSettings({ autoTranscribe: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
            </label>
          </div>

          {/* Subtitle Mode: Single vs Double / Bilingual */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
              1. Subtitle Mode (Single or Double Language)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onUpdateSettings({ transcriptionBilingual: false })}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                  !settings.transcriptionBilingual
                    ? 'border-indigo-500 bg-indigo-500/10 text-white ring-1 ring-indigo-500'
                    : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700 hover:text-white'
                }`}
              >
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 mt-0.5">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <span>Single Language</span>
                    {!settings.transcriptionBilingual && (
                      <Check className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Transcribes exactly in the spoken language (e.g., English or Chinese)
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ transcriptionBilingual: true })}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition cursor-pointer ${
                  settings.transcriptionBilingual
                    ? 'border-rose-500 bg-rose-500/10 text-white ring-1 ring-rose-500'
                    : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700 hover:text-white'
                }`}
              >
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-300 mt-0.5">
                  <Languages className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <span>Double / Bilingual</span>
                    {settings.transcriptionBilingual && (
                      <Check className="w-3.5 h-3.5 text-rose-400" />
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Dual stacked lines (e.g. English speech + Chinese paired subtitles)
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Primary Spoken Language Selection */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                2. Spoken Language (Reaction Commentary)
              </label>
              <span className="text-[11px] text-neutral-400">Select spoken language</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = currentPrimary === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({
                        transcriptionPrimaryLang: lang.code,
                        // If secondary was identical, adjust secondary
                        ...(currentSecondary === lang.code
                          ? { transcriptionSecondaryLang: lang.code.startsWith('zh') ? 'en-US' : 'zh-CN' }
                          : {}),
                      })
                    }
                    className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/20 text-white font-bold ring-1 ring-indigo-500'
                        : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                    }`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">{lang.name}</div>
                      <div className="text-[10px] text-neutral-500 truncate">{lang.native}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Secondary Companion Language (for Double / Bilingual mode) */}
          {settings.transcriptionBilingual && (
            <div className="p-4 rounded-xl bg-neutral-950/40 border border-neutral-800">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  3. Companion Subtitle Language (Double Mode)
                </label>
                <span className="text-[11px] text-neutral-400">Target companion text</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {SUPPORTED_LANGUAGES.filter((l) => l.code !== currentPrimary).map((lang) => {
                  const isSelected = currentSecondary === lang.code;
                  return (
                    <button
                      key={`sec-${lang.code}`}
                      type="button"
                      onClick={() => onUpdateSettings({ transcriptionSecondaryLang: lang.code })}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/20 text-white font-bold ring-1 ring-amber-500'
                          : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate">{lang.name}</div>
                        <div className="text-[10px] text-neutral-500 truncate">{lang.native}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Auto-Hide Video When Paused Feature */}
          <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white">
                    Auto-Hide Local Video on Pause
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  When you pause the reaction, the source video magically hides from view so the viewer focuses on you. When resumed, it pre-loads the next frame instantly before smooth playback begins.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoHideVideoOnPause}
                  onChange={(e) => onUpdateSettings({ autoHideVideoOnPause: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Info className="w-4 h-4 text-indigo-400" />
            <span>Subtitles render dynamically onto live canvas and recorded takes</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
};
