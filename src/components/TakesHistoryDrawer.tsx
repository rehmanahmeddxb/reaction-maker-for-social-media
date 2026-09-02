import React from 'react';
import {
  X,
  Film,
  Download,
  Trash2,
  Play,
  Calendar,
  Clock,
  HardDrive,
} from 'lucide-react';
import { RecordedTake } from '../types';

interface TakesHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  takes: RecordedTake[];
  onSelectTake: (take: RecordedTake) => void;
  onDeleteTake: (id: string) => void;
}

export const TakesHistoryDrawer: React.FC<TakesHistoryDrawerProps> = ({
  isOpen,
  onClose,
  takes,
  onSelectTake,
  onDeleteTake,
}) => {
  if (!isOpen) return null;

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-neutral-900/95 border-l border-neutral-800 shadow-2xl z-40 flex flex-col backdrop-blur-xl animate-slideLeft">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-white font-['Outfit']">Studio Takes Gallery</h2>
            <p className="text-xs text-neutral-400">
              {takes.length} {takes.length === 1 ? 'recording' : 'recordings'} saved in library
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

      {/* Takes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {takes.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-neutral-500">
            <Film className="w-10 h-10 stroke-1 mb-3 text-neutral-600" />
            <h3 className="text-sm font-semibold text-neutral-400 mb-1">No Takes Yet</h3>
            <p className="text-xs text-neutral-500 max-w-xs">
              Hit Record in the studio to start capturing your first synchronized reaction video!
            </p>
          </div>
        ) : (
          takes.map((take) => (
            <div
              key={take.id}
              className="p-3 rounded-xl bg-neutral-800/60 border border-neutral-800 hover:border-neutral-700 transition flex flex-col gap-2.5 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white truncate">
                    {take.title}
                  </h4>
                  <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-rose-400" />
                      {formatSecs(take.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-amber-400" />
                      {formatSize(take.sizeBytes)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-neutral-700 text-neutral-300 text-[10px] font-mono">
                      {take.aspectRatio}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteTake(take.id)}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-700/50 transition cursor-pointer"
                  title="Delete Take"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-neutral-700/40">
                <button
                  type="button"
                  onClick={() => {
                    onSelectTake(take);
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-xs font-medium transition cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Play & Review</span>
                </button>

                <a
                  href={take.videoUrl}
                  download={`${take.title.replace(/\s+/g, '_')}.webm`}
                  className="flex items-center justify-center p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-medium transition cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
