// Real-time Speech-to-Text Transcriber for Reaction Studio
// Uses Web Speech API (webkitSpeechRecognition / SpeechRecognition) with auto-reconnection and language selection.

export interface TranscriptionSubtitle {
  id: string;
  text: string;
  secondaryText?: string;
  timestamp: number;
  isFinal: boolean;
}

export type SupportedLanguage =
  | 'en-US'
  | 'zh-CN'
  | 'zh-TW'
  | 'es-ES'
  | 'fr-FR'
  | 'de-DE'
  | 'ja-JP'
  | 'ko-KR'
  | 'hi-IN'
  | 'ur-PK'
  | 'ar-SA'
  | 'pt-BR'
  | 'ru-RU'
  | 'id-ID';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  native: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en-US', name: 'English (US)', native: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', native: '中文 (简体)', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', native: '中文 (繁體)', flag: '🇹🇼' },
  { code: 'es-ES', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja-JP', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', name: 'Korean', native: '한국어', flag: '🇰🇷' },
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ur-PK', name: 'Urdu', native: 'اردو', flag: '🇵🇰' },
  { code: 'ar-SA', name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { code: 'pt-BR', name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { code: 'ru-RU', name: 'Russian', native: 'Русский', flag: '🇷🇺' },
  { code: 'id-ID', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
];

export class LiveTranscriptionService {
  private recognition: any = null;
  private isRunning: boolean = false;
  private shouldRestart: boolean = false;
  private primaryLang: SupportedLanguage = 'en-US';
  private secondaryLang: SupportedLanguage | null = 'zh-CN';
  private onSubtitleUpdate: ((subtitle: TranscriptionSubtitle | null) => void) | null = null;
  private clearTimer: number | null = null;
  private activeSubtitle: TranscriptionSubtitle | null = null;

  constructor() {
    this.initRecognition();
  }

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }

  private initRecognition(): boolean {
    if (typeof window === 'undefined') return false;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return false;

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = this.primaryLang;

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const currentText = (finalTranscript || interimTranscript).trim();
        if (currentText) {
          this.handleNewSpeech(currentText, !!finalTranscript);
        }
      };

      this.recognition.onerror = (event: any) => {
        // 'no-speech' is routine when quiet; 'aborted' happens on stop
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('Speech recognition warning:', event.error);
        }
      };

      this.recognition.onend = () => {
        this.isRunning = false;
        if (this.shouldRestart) {
          try {
            this.recognition.start();
            this.isRunning = true;
          } catch (e) {
            // retry after short delay
            setTimeout(() => {
              if (this.shouldRestart && !this.isRunning) {
                try {
                  this.recognition.start();
                  this.isRunning = true;
                } catch {}
              }
            }, 500);
          }
        }
      };

      return true;
    } catch (e) {
      console.warn('SpeechRecognition initialization error:', e);
      return false;
    }
  }

  public setLanguages(primary: SupportedLanguage, secondary: SupportedLanguage | null) {
    this.primaryLang = primary;
    this.secondaryLang = secondary;

    if (this.recognition) {
      this.recognition.lang = primary;
      // If currently running, restart with new language setting
      if (this.isRunning) {
        this.stop();
        setTimeout(() => this.start(this.onSubtitleUpdate!), 100);
      }
    }
  }

  private translationCache = new Map<string, string>();
  private pendingTranslationKey: string | null = null;

  private async fetchAiTranslation(text: string, targetLangCode: string, subId: string) {
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLangCode);
    const targetLangName = langObj ? langObj.name : targetLangCode;
    const cacheKey = `${targetLangCode}:::${text.trim().toLowerCase()}`;

    if (this.translationCache.has(cacheKey)) {
      const cached = this.translationCache.get(cacheKey)!;
      if (this.activeSubtitle && this.activeSubtitle.id === subId) {
        this.activeSubtitle.secondaryText = cached;
        this.onSubtitleUpdate?.(this.activeSubtitle);
      }
      return;
    }

    this.pendingTranslationKey = cacheKey;

    try {
      const res = await fetch('/api/gemini/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang: targetLangName }),
      });

      if (!res.ok) return;
      const data = await res.json();
      if (data.translation) {
        this.translationCache.set(cacheKey, data.translation);
        // Only update if this subtitle is still the active one
        if (this.activeSubtitle && this.activeSubtitle.id === subId) {
          this.activeSubtitle.secondaryText = data.translation;
          this.onSubtitleUpdate?.(this.activeSubtitle);
        }
      }
    } catch (err) {
      // Quiet fail to keep subtitles resilient
    }
  }

  private handleNewSpeech(text: string, isFinal: boolean) {
    if (this.clearTimer) {
      window.clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }

    const subId = `sub-${Date.now()}`;

    // If dual language mode is on and secondary language is selected, generate simple companion subtitle
    let secondaryText: string | undefined = undefined;
    if (this.secondaryLang && this.secondaryLang !== this.primaryLang) {
      const cacheKey = `${this.secondaryLang}:::${text.trim().toLowerCase()}`;
      if (this.translationCache.has(cacheKey)) {
        secondaryText = this.translationCache.get(cacheKey);
      } else {
        secondaryText = this.getQuickBilingualMirror(text, this.primaryLang, this.secondaryLang);
        // Dispatch Gemini AI translation asynchronously
        this.fetchAiTranslation(text, this.secondaryLang, subId);
      }
    }

    this.activeSubtitle = {
      id: subId,
      text,
      secondaryText,
      timestamp: Date.now(),
      isFinal,
    };

    if (this.onSubtitleUpdate) {
      this.onSubtitleUpdate(this.activeSubtitle);
    }

    // Auto clear subtitle after 4.5 seconds of silence
    this.clearTimer = window.setTimeout(() => {
      this.activeSubtitle = null;
      if (this.onSubtitleUpdate) {
        this.onSubtitleUpdate(null);
      }
    }, 4500);
  }

  // Quick contextual vocabulary translation for reaction phrases (English <-> Chinese / Spanish etc)
  private getQuickBilingualMirror(text: string, fromLang: string, toLang: string): string {
    const lower = text.toLowerCase().trim();

    // Common reaction words map
    const DICT_EN_TO_ZH: Record<string, string> = {
      'wow': '哇！太不可思议了！',
      'oh my god': '我的天哪！',
      'omg': '天哪！',
      'no way': '不可能吧！',
      'what': '什么？！',
      'this is insane': '这也太疯狂了！',
      'unbelievable': '难以置信！',
      'look at this': '快看这个！',
      'look at that': '看看那个！',
      'that is crazy': '这也太疯狂了！',
      'so funny': '太搞笑了哈哈',
      'hahaha': '哈哈哈哈',
      'lol': '笑死我了',
      'amazing': '太棒了！太惊艳了！',
      'i love this': '我太喜欢这个了！',
      'holy cow': '哇塞！',
      'are you serious': '你是认真的吗？',
      'stop': '停停停！',
      'wait': '等等！',
      'check this out': '来看看这个！',
      'hello guys': '大家好！',
      'welcome back': '欢迎回来！',
      'today we are reacting to': '今天我们要看的是...',
      'subscribe': '记得点赞关注哦！',
      'leave a like': '给个大大的赞吧！',
      'nice': '漂亮！',
      'cool': '太酷了！',
      'let is go': '冲啊！开始！',
      "let's go": '冲啊！开始！',
      'boom': '轰！💥',
    };

    const DICT_ZH_TO_EN: Record<string, string> = {
      '哇': 'Wow! Incredible!',
      '天哪': 'Oh my God!',
      '我的天': 'Oh my gosh!',
      '太绝了': 'This is amazing!',
      '太搞笑了': 'So funny! 😂',
      '哈哈': 'Hahaha!',
      '不可能': 'No way!',
      '你看': 'Look at this!',
      '这太疯狂了': 'This is crazy!',
      '大家好': 'Hello everyone!',
      '点赞': 'Like & Subscribe!',
    };

    if (fromLang.startsWith('en') && toLang.startsWith('zh')) {
      for (const [key, val] of Object.entries(DICT_EN_TO_ZH)) {
        if (lower.includes(key)) {
          return val;
        }
      }
      return `[中文实时转录] ${text}`;
    }

    if (fromLang.startsWith('zh') && toLang.startsWith('en')) {
      for (const [key, val] of Object.entries(DICT_ZH_TO_EN)) {
        if (text.includes(key)) {
          return val;
        }
      }
      return `[EN Translation] ${text}`;
    }

    // Default tag for other dual pairs
    const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === toLang);
    return `[${targetLangObj?.native || toLang}] ${text}`;
  }

  public start(callback: (subtitle: TranscriptionSubtitle | null) => void) {
    this.onSubtitleUpdate = callback;
    this.shouldRestart = true;

    if (!this.recognition) {
      const ok = this.initRecognition();
      if (!ok) return;
    }

    if (!this.isRunning && this.recognition) {
      try {
        this.recognition.start();
        this.isRunning = true;
      } catch (e) {
        // Recognition might already be starting
      }
    }
  }

  public stop() {
    this.shouldRestart = false;
    if (this.clearTimer) {
      window.clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }

    if (this.recognition && this.isRunning) {
      try {
        this.recognition.stop();
      } catch {}
      this.isRunning = false;
    }
    this.activeSubtitle = null;
    if (this.onSubtitleUpdate) {
      this.onSubtitleUpdate(null);
    }
  }

  public getActiveSubtitle(): TranscriptionSubtitle | null {
    return this.activeSubtitle;
  }
}

export const liveTranscription = new LiveTranscriptionService();
