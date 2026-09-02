import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Share2,
  Film,
  Sparkles,
  Scissors,
  Clock,
  HardDrive,
  Copy,
  Check,
  Wand2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RecordedTake } from '../types';

interface PlaybackExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  take: RecordedTake | null;
  onSaveToGallery: (take: RecordedTake) => void;
  onRetake: () => void;
}

export const PlaybackExportModal: React.FC<PlaybackExportModalProps> = ({
  isOpen,
  onClose,
  take,
  onSaveToGallery,
  onRetake,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [showTrimControls, setShowTrimControls] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // AI Viral Package State
  const [viralPackage, setViralPackage] = useState<{
    titles: string[];
    openingHook: string;
    hashtags: string[];
    description: string;
  } | null>(null);
  const [isGeneratingViral, setIsGeneratingViral] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateViralPackage = async () => {
    if (!take) return;
    setIsGeneratingViral(true);
    try {
      const res = await fetch('/api/gemini/viral-hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle: take.title,
          durationSecs: duration || take.duration,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setViralPackage(data);
      }
    } catch (err) {
      console.warn('Failed to generate viral package:', err);
    } finally {
      setIsGeneratingViral(false);
    }
  };

  if (!isOpen || !take) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleDownload = () => {
    try {
      const a = document.createElement('a');
      a.href = take.videoUrl;
      const cleanTitle = (take.title || 'reaction_take').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanTitle}_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setIsDownloaded(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-['Outfit']">
                  Reaction Video Ready!
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  SYNC MERGED
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Preview your synchronized camera and source video reaction
              </p>
            </div>
          </div>
          <button
            id="btn-close-export-modal"
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Stage */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
          <div className="relative w-full aspect-video max-h-[48vh] bg-black rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center group shadow-inner">
            <video
              ref={videoRef}
              src={take.videoUrl}
              className="w-full h-full object-contain"
              playsInline
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration || take.duration);
                }
              }}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Play/Pause Overlay */}
            <div
              onClick={togglePlay}
              className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition flex items-center justify-center cursor-pointer"
            >
              <button
                type="button"
                className="p-4 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white shadow-2xl transform group-hover:scale-110 transition cursor-pointer"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
              </button>
            </div>

            {/* Timeline Progress Bar at bottom of video */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center gap-3">
              <span className="font-mono text-xs text-white">
                {formatSecs(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || take.duration || 100}
                step="0.1"
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCurrentTime(val);
                  if (videoRef.current) {
                    videoRef.current.currentTime = val;
                  }
                }}
                className="flex-1 accent-rose-500 h-1 bg-neutral-700/80 rounded-lg cursor-pointer"
              />
              <span className="font-mono text-xs text-neutral-400">
                {formatSecs(duration || take.duration)}
              </span>
            </div>
          </div>

          {/* Quick Details Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-neutral-800/50 border border-neutral-800 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-rose-400" />
              <div>
                <span className="text-[10px] text-neutral-400 block">Length</span>
                <span className="font-semibold text-neutral-200">
                  {formatSecs(duration || take.duration)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-800/50 border border-neutral-800 flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[10px] text-neutral-400 block">File Size</span>
                <span className="font-semibold text-neutral-200">
                  {formatSize(take.sizeBytes)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-800/50 border border-neutral-800 flex items-center gap-2.5">
              <Film className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="text-[10px] text-neutral-400 block">Aspect Ratio</span>
                <span className="font-semibold text-neutral-200">
                  {take.aspectRatio}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-800/50 border border-neutral-800 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[10px] text-neutral-400 block">Layout Mode</span>
                <span className="font-semibold text-neutral-200 truncate capitalize">
                  {take.layout.replace(/-/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Optional Trim Tool */}
          <div className="p-3.5 rounded-xl bg-neutral-800/30 border border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setShowTrimControls(!showTrimControls)}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 text-rose-400" />
                <span>Trim Video Range (Start / End Markers)</span>
              </button>
              <span className="text-[11px] text-neutral-500">
                {showTrimControls ? 'Hide markers' : 'Click to adjust'}
              </span>
            </div>

            {showTrimControls && (
              <div className="pt-2 space-y-3">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">Start:</span>
                    <input
                      type="number"
                      min="0"
                      max={duration || 100}
                      value={trimStart}
                      onChange={(e) => setTrimStart(parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-white font-mono"
                    />
                    <span className="text-neutral-500">s</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">End:</span>
                    <input
                      type="number"
                      min="0"
                      max={duration || 100}
                      value={trimEnd}
                      onChange={(e) => setTrimEnd(parseFloat(e.target.value) || duration)}
                      className="w-16 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-white font-mono"
                    />
                    <span className="text-neutral-500">s</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AI Viral Package Generator */}
          <div className="p-4 rounded-xl bg-gradient-to-b from-neutral-800/40 to-neutral-900/60 border border-neutral-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Wand2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    AI Viral Creator Kit
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-500/20 text-rose-300">
                      Gemini 2.5
                    </span>
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Auto-generate click-worthy titles, pinned hook, and hashtags
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateViralPackage}
                disabled={isGeneratingViral}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition cursor-pointer"
              >
                {isGeneratingViral ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing Reaction...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{viralPackage ? 'Regenerate Kit' : 'Generate Viral Kit'}</span>
                  </>
                )}
              </button>
            </div>

            {viralPackage && (
              <div className="pt-2 space-y-3 border-t border-neutral-800">
                {/* Titles */}
                <div>
                  <span className="text-[11px] font-semibold text-neutral-400 block mb-1.5">
                    High-CTR Title Options:
                  </span>
                  <div className="space-y-1.5">
                    {viralPackage.titles.map((title, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800/80 flex items-center justify-between gap-2 text-xs text-neutral-200 group hover:border-neutral-700"
                      >
                        <span className="truncate">{title}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(title, `title-${idx}`)}
                          className="p-1 rounded text-neutral-400 hover:text-white transition cursor-pointer shrink-0"
                          title="Copy title"
                        >
                          {copiedKey === `title-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Opening Hook */}
                {viralPackage.openingHook && (
                  <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-rose-400 font-semibold uppercase block">
                        Pinned Opening Hook
                      </span>
                      <span className="text-neutral-200 italic">"{viralPackage.openingHook}"</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(viralPackage.openingHook, 'hook')}
                      className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer shrink-0"
                      title="Copy hook"
                    >
                      {copiedKey === 'hook' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Hashtags */}
                {viralPackage.hashtags?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-neutral-400 mr-1">Hashtags:</span>
                    {viralPackage.hashtags.map((tag, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => copyToClipboard(tag, `tag-${idx}`)}
                        className="px-2 py-0.5 rounded-md bg-neutral-800 text-[11px] text-neutral-300 hover:text-white hover:bg-neutral-700 transition cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(viralPackage.hashtags.join(' '), 'all-tags')}
                      className="ml-auto text-[11px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'all-tags' ? 'Copied all!' : 'Copy all'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-800 bg-neutral-900/80 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onRetake();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-neutral-400" />
            <span>Retake / Record Again</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onSaveToGallery(take);
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition cursor-pointer"
            >
              Save to Studio Takes
            </button>

            <button
              id="btn-download-video-export"
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloaded ? 'Downloaded Again' : 'Export & Download Video'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
