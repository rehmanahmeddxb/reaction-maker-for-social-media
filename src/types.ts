export type LayoutMode =
  | 'pip-custom'
  | 'pip-bottom-right'
  | 'pip-bottom-left'
  | 'pip-top-right'
  | 'pip-top-left'
  | 'split-side-by-side'
  | 'split-top-bottom'
  | 'stacked-shorts';

export type CameraShape = 'rectangle' | 'square' | 'rounded-rect' | 'circle' | 'oval';

export type MainFeedRole = 'camera' | 'video';

export type PipRectRatio = '16:9' | '4:3' | '1:1';

export type AspectRatio = '16:9' | '9:16' | '1:1';

export type VideoFilter = 'none' | 'vibrant' | 'warm' | 'cyberpunk' | 'vintage' | 'grayscale';

export interface SourceVideo {
  id: string;
  title: string;
  category: string;
  url: string;
  duration?: number;
  thumbnail?: string;
  description?: string;
  isCustom?: boolean;
  resolution?: string;
  fileSizeFormatted?: string;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  rotation: number;
  timestamp: number;
}

export interface SoundEffect {
  id: string;
  name: string;
  icon: string;
  emoji: string;
  category: 'reaction' | 'meme' | 'dramatic' | 'funny';
  soundKey: 'airhorn' | 'applause' | 'boom' | 'laugh' | 'dun_dun_dun' | 'punch' | 'ding' | 'gasp' | 'buzzer' | 'cheer';
}

export interface RecordedTake {
  id: string;
  timestamp: number;
  duration: number;
  videoBlob: Blob;
  videoUrl: string;
  title: string;
  layout: LayoutMode;
  aspectRatio: AspectRatio;
  sizeBytes: number;
  thumbnailUrl?: string;
}

export type CameraFacingMode = 'user' | 'environment';
export type FlashlightMode = 'off' | 'front' | 'back' | 'both';
export type FrontFlashTone = 'daylight' | 'warm' | 'golden' | 'soft-pink';

export interface StudioSettings {
  mainFeed: MainFeedRole; // Which feed occupies the full screen main canvas
  layout: LayoutMode;
  cameraShape: CameraShape;
  pipRectRatio: PipRectRatio;
  pipCornerRadius: number; // in pixels (0 for sharp corner, 16 for rounded card)
  aspectRatio: AspectRatio; // 16:9 landscape or 9:16 portrait
  pipSizePercent: number; // 15 to 60%
  pipCustomX: number; // 0 to 100 (% of canvas width)
  pipCustomY: number; // 0 to 100 (% of canvas height)
  isCustomPipPosition: boolean;
  pipBorderColor: string;
  pipBorderWidth: number;
  pipGlow: boolean;
  pipShadow: boolean;
  mirrorCamera: boolean;
  cameraFacingMode: CameraFacingMode; // 'user' (front) or 'environment' (back)
  // Flashlight Controls
  flashlightMode: FlashlightMode; // 'off' | 'front' | 'back' | 'both'
  frontFlashBrightness: number; // 0.2 to 1.0 (default 0.9)
  frontFlashTone: FrontFlashTone; // 'daylight' | 'warm' | 'golden' | 'soft-pink'
  sourceVolume: number; // 0 to 1
  micVolume: number;    // 0 to 1
  sfxVolume: number;    // 0 to 1
  overlayTitle: string;
  showWatermark: boolean; // default false, never in export unless opted in
  watermarkText: string;
  showTimerBadgeOnCanvas: boolean; // default false: timer seconds are NOT burned into export canvas
  filter: VideoFilter;
  // Auto Live Transcribing Camera Audio
  autoTranscribe: boolean;
  transcriptionPrimaryLang: string; // e.g. 'en-US' or 'zh-CN'
  transcriptionSecondaryLang: string | null; // e.g. 'zh-CN' for bilingual dual subtitle
  transcriptionBilingual: boolean; // single or double language
  // Auto-hide source video on pause & seamless pre-frame load
  autoHideVideoOnPause: boolean;
}
