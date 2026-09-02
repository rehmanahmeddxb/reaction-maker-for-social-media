import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Link,
  Play,
  Check,
  Film,
  Sparkles,
  FileVideo,
  Loader2,
  AlertCircle,
  Clock,
  Maximize2,
  HardDrive,
} from 'lucide-react';
import { SourceVideo } from '../types';
import { SAMPLE_VIDEOS } from '../utils/sampleVideos';
import {
  captureVideoThumbnail,
  createObjectUrlForVideoFile,
  mountDecoderVideo,
  primeVideoFrame,
} from '../utils/videoLoader';

interface SourceVideoSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVideo: SourceVideo | null;
  onSelectVideo: (video: SourceVideo) => void;
}

export const SourceVideoSelector: React.FC<SourceVideoSelectorProps> = ({
  isOpen,
  onClose,
  selectedVideo,
  onSelectVideo,
}) => {
  const [tab, setTab] = useState<'samples' | 'upload' | 'url'>('samples');
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [loadingProgressStatus, setLoadingProgressStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Local file reader: keep a real in-DOM decoder so the first frame isn't black.
  const processLocalVideoFile = async (file: File) => {
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|mkv|avi|m4v|ogg|ogv)$/i)) {
      setErrorMessage('Please upload a supported video file format (.mp4, .webm, .mov).');
      return;
    }

    setErrorMessage(null);
    setIsLoadingFile(true);
    setLoadingProgressStatus('Reading video file and extracting metadata...');

    let objectUrl = '';
    let video: HTMLVideoElement | null = null;

    try {
      objectUrl = await createObjectUrlForVideoFile(file);
      video = mountDecoderVideo();
      video.src = objectUrl;
      video.load();

      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => resolve(), 8000);
        const onMeta = () => {
          setLoadingProgressStatus('Decoding first frame so the clip is not a black screen...');
        };
        const onReady = () => {
          window.clearTimeout(timer);
          video?.removeEventListener('loadedmetadata', onMeta);
          video?.removeEventListener('loadeddata', onReady);
          video?.removeEventListener('error', onErr);
          resolve();
        };
        const onErr = () => {
          window.clearTimeout(timer);
          video?.removeEventListener('loadedmetadata', onMeta);
          video?.removeEventListener('loadeddata', onReady);
          reject(new Error('Browser could not decode this video format. Try MP4 (H.264) or WebM.'));
        };
        video!.addEventListener('loadedmetadata', onMeta);
        video!.addEventListener('loadeddata', onReady, { once: true });
        video!.addEventListener('error', onErr, { once: true });
      });

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('This file loaded without video frames. Re-export as H.264 MP4 and try again.');
      }

      setLoadingProgressStatus('Buffering a visible preview frame...');
      await primeVideoFrame(video, 'play');

      setLoadingProgressStatus('Generating high-resolution thumbnail preview...');
      const thumbUrl = captureVideoThumbnail(video);

      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      let resBadge = `${width}x${height}`;
      if (width >= 1920 || height >= 1080) resBadge = '1080p FHD';
      else if (width >= 1280 || height >= 720) resBadge = '720p HD';

      const newVideo: SourceVideo = {
        id: `local-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        category: 'Local Device Video',
        url: objectUrl,
        duration: Math.round(Number.isFinite(video.duration) ? video.duration : 0),
        thumbnail: thumbUrl,
        resolution: resBadge,
        fileSizeFormatted: `${sizeMB} MB`,
        description: `Fully loaded local video (${sizeMB} MB, ${resBadge})`,
        isCustom: true,
      };

      setIsLoadingFile(false);
      onSelectVideo(newVideo);
      onClose();
    } catch (err: any) {
      console.error('File load error:', err);
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore
        }
      }
      setIsLoadingFile(false);
      setErrorMessage(err.message || 'Failed to read video file. Please check format.');
    } finally {
      if (video) {
        try {
          video.pause();
          video.remove();
        } catch {
          // ignore
        }
      }
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    let videoUrl = customUrl.trim();
    // If it's a remote URL, route through the server CORS proxy so canvas captureStream isn't tainted
    if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
      videoUrl = `/api/proxy-video?url=${encodeURIComponent(videoUrl)}`;
    }

    const newVideo: SourceVideo = {
      id: `custom-url-${Date.now()}`,
      title: customTitle.trim() || 'Online Stream Video',
      category: 'Direct URL',
      url: videoUrl,
      description: 'Streamed safely via CORS studio proxy',
      isCustom: true,
    };

    onSelectVideo(newVideo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-['Outfit']">Select Source Video</h2>
              <p className="text-xs text-neutral-400">
                Upload your local video, choose a curated clip, or paste a URL
              </p>
            </div>
          </div>
          <button
            id="btn-close-source-selector"
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-neutral-800 flex gap-2">
          <button
            onClick={() => setTab('upload')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              tab === 'upload'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Local Video File
          </button>
          <button
            onClick={() => setTab('samples')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              tab === 'samples'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Reaction Clips ({SAMPLE_VIDEOS.length})
          </button>
          <button
            onClick={() => setTab('url')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              tab === 'url'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Link className="w-4 h-4" />
            Paste Video URL
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center gap-3 text-red-300 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Upload Tab */}
          {tab === 'upload' && (
            <div className="flex flex-col items-center justify-center py-6">
              <input
                type="file"
                ref={fileInputRef}
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska,.mkv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processLocalVideoFile(e.target.files[0]);
                  }
                }}
              />

              {isLoadingFile ? (
                <div className="w-full max-w-lg border border-neutral-700 bg-neutral-800/40 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
                  <div className="relative mb-4">
                    <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
                    <Film className="w-5 h-5 text-white absolute inset-0 m-auto" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    Loading & Buffering Local Video...
                  </h3>
                  <p className="text-xs text-rose-400 font-medium max-w-sm mb-3">
                    {loadingProgressStatus}
                  </p>
                  <span className="text-[11px] text-neutral-400">
                    Preparing 100% smooth synchronization with camera feed
                  </span>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      processLocalVideoFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full max-w-lg border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                    isDragging
                      ? 'border-rose-500 bg-rose-500/10 scale-[1.01]'
                      : 'border-neutral-700 bg-neutral-800/30 hover:border-neutral-600 hover:bg-neutral-800/60'
                  }`}
                >
                  <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-400 mb-4 border border-rose-500/20">
                    <FileVideo className="w-10 h-10" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    Drag & Drop any local video file here
                  </h3>
                  <p className="text-xs text-neutral-400 mb-4 max-w-xs">
                    Supports MP4, WebM, MOV, and MKV. Reads and indexes fully for zero stuttering or freeze.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/25 transition cursor-pointer"
                    >
                      Browse Device Files
                    </button>
                  </div>
                </div>
              )}

              {/* Tips for Best Performance */}
              <div className="w-full max-w-lg mt-6 p-4 rounded-xl bg-neutral-950/40 border border-neutral-800 text-xs text-neutral-400 space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ultra-Smooth Reaction Engine:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-neutral-400 pl-1">
                  <li>Direct in-memory video stream caching for latency-free seeks</li>
                  <li>Automatic audio track separation and VU volume monitoring</li>
                  <li>Scalable PiP positioning: snap to corners or drag anywhere</li>
                </ul>
              </div>
            </div>
          )}

          {/* Sample Clips Tab */}
          {tab === 'samples' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SAMPLE_VIDEOS.map((video) => {
                const isSelected = selectedVideo?.id === video.id;
                return (
                  <div
                    key={video.id}
                    onClick={() => {
                      onSelectVideo(video);
                      onClose();
                    }}
                    className={`group relative rounded-xl overflow-hidden border p-3 cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500'
                        : 'border-neutral-800 bg-neutral-800/40 hover:border-neutral-700 hover:bg-neutral-800/80'
                    }`}
                  >
                    <div className="aspect-video w-full rounded-lg overflow-hidden bg-neutral-950 relative mb-3">
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600">
                          <Play className="w-8 h-8" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition flex items-center justify-center">
                        <div className="p-2.5 rounded-full bg-rose-500/90 text-white shadow-lg transform group-hover:scale-110 transition">
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/70 text-white backdrop-blur-xs">
                        {video.category}
                      </span>
                      {video.duration && (
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/70 text-neutral-300">
                          {Math.floor(video.duration / 60)}:
                          {(video.duration % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm text-neutral-100 group-hover:text-rose-400 transition line-clamp-1">
                          {video.title}
                        </h3>
                        {isSelected && (
                          <div className="shrink-0 p-1 rounded-full bg-rose-500 text-white">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                        {video.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* URL Tab */}
          {tab === 'url' && (
            <form onSubmit={handleUrlSubmit} className="max-w-lg mx-auto py-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Direct Video URL (MP4 / WebM direct stream)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/video.mp4"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-800/80 border border-neutral-700 text-white text-sm focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Clip Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Viral Meme Reaction"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-800/80 border border-neutral-700 text-white text-sm focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-lg shadow-rose-600/25 cursor-pointer"
                >
                  Load Web Stream
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
