import { audioEngine } from './audioSynthesizer';

export interface RecorderOptions {
  canvas: HTMLCanvasElement;
  sourceVideo: HTMLVideoElement | null;
  micStream: MediaStream | null;
  sourceVolume: number;
  micVolume: number;
  fps?: number;
}

export class ReactionMediaRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private sourceAudioNode: MediaElementAudioSourceNode | null = null;
  private micAudioNode: MediaStreamAudioSourceNode | null = null;
  private sourceGainNode: GainNode | null = null;
  private micGainNode: GainNode | null = null;
  private mixedDestination: MediaStreamAudioDestinationNode | null = null;
  private startTime: number = 0;
  private totalDuration: number = 0;
  private mimeType: string = 'video/webm';

  public async startRecording(options: RecorderOptions): Promise<void> {
    this.recordedChunks = [];
    this.startTime = Date.now();

    const ctx = audioEngine.init();
    this.mixedDestination = ctx.createMediaStreamDestination();

    // 1. Connect SFX to destination
    const sfxDest = audioEngine.getDestination();
    if (sfxDest) {
      // already routed in AudioEngine
    }

    // 2. Connect Microphone stream if available
    if (options.micStream && options.micStream.getAudioTracks().length > 0) {
      try {
        this.micAudioNode = ctx.createMediaStreamSource(options.micStream);
        this.micGainNode = ctx.createGain();
        this.micGainNode.gain.setValueAtTime(options.micVolume, ctx.currentTime);
        this.micAudioNode.connect(this.micGainNode);
        this.micGainNode.connect(this.mixedDestination);
        // Note: Do NOT connect micGainNode to ctx.destination to avoid acoustic feedback echo into creator speakers
      } catch (e) {
        console.warn('Microphone audio node connect error:', e);
      }
    }

    // 3. Connect Source Video audio if accessible.
    //    createMediaElementSource() can only ever be called ONCE per element,
    //    so the node is cached — but it must be re-pointed at the new
    //    destination every take, otherwise take #2 onwards records no clip
    //    audio at all.
    if (options.sourceVideo) {
      try {
        if (!this.sourceAudioNode) {
          this.sourceAudioNode = ctx.createMediaElementSource(options.sourceVideo);
        }
        if (!this.sourceGainNode) {
          this.sourceGainNode = ctx.createGain();
          this.sourceAudioNode.connect(this.sourceGainNode);
          // Keep the creator hearing the clip through their speakers.
          this.sourceGainNode.connect(ctx.destination);
        }
        this.sourceGainNode.gain.setValueAtTime(options.sourceVolume, ctx.currentTime);
        try {
          this.sourceGainNode.disconnect(this.mixedDestination);
        } catch {
          /* not connected yet */
        }
        this.sourceGainNode.connect(this.mixedDestination);
      } catch (e) {
        console.warn('Source video AudioNode capture CORS fallback:', e);
      }
    }

    // 4. Capture Canvas stream (at 30 or 60 fps)
    const fps = options.fps || 30;

    // A tainted canvas throws here — that is the difference between "export is
    // black" and a clear message. Surface it instead of recording nothing.
    let canvasStream: MediaStream;
    try {
      canvasStream = options.canvas.captureStream(fps);
    } catch (e: any) {
      throw new Error(
        'The preview canvas is tainted by a cross-origin video, so it cannot be recorded. ' +
          'Upload the clip as a local file or use the URL tab (it routes through the studio proxy). ' +
          `(${e?.message || e})`
      );
    }

    if (canvasStream.getVideoTracks().length === 0) {
      throw new Error('Canvas produced no video track — recording aborted.');
    }

    // 5. Combine Canvas Video Track + Mixed Audio Track(s)
    const combinedStream = new MediaStream();
    
    // Add canvas video tracks
    canvasStream.getVideoTracks().forEach((track) => combinedStream.addTrack(track));

    // Add audio tracks from mixed destination
    if (this.mixedDestination.stream.getAudioTracks().length > 0) {
      this.mixedDestination.stream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
    } else if (options.micStream && options.micStream.getAudioTracks().length > 0) {
      // Fallback: direct mic track
      options.micStream.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
    }

    // Select supported mimeType
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1,mp4a',
      'video/mp4'
    ];

    let chosenMime = 'video/webm';
    for (const m of mimeTypes) {
      if (MediaRecorder.isTypeSupported(m)) {
        chosenMime = m;
        break;
      }
    }
    this.mimeType = chosenMime;

    this.mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: this.mimeType,
      videoBitsPerSecond: 4_000_000, // Crisp 4Mbps stream
      audioBitsPerSecond: 192_000,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    // Request data in 500ms intervals
    this.mediaRecorder.start(500);
  }

  public pauseRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  public resumeRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  public stopRecording(): Promise<{ blob: Blob; duration: number; mimeType: string }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording active'));
        return;
      }

      this.totalDuration = (Date.now() - this.startTime) / 1000;

      this.mediaRecorder.onstop = () => {
        const finalBlob = new Blob(this.recordedChunks, { type: this.mimeType });
        resolve({
          blob: finalBlob,
          duration: this.totalDuration,
          mimeType: this.mimeType,
        });
      };

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    });
  }

  public setVolumes(sourceVol: number, micVol: number) {
    const ctx = audioEngine.getContext();
    if (ctx) {
      if (this.sourceGainNode) {
        this.sourceGainNode.gain.setValueAtTime(sourceVol, ctx.currentTime);
      }
      if (this.micGainNode) {
        this.micGainNode.gain.setValueAtTime(micVol, ctx.currentTime);
      }
    }
  }
}
