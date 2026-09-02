// Procedural Animated Virtual Creator Cam for fallback demo mode

export class FallbackAvatarRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private audioLevel: number = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 480;
    this.ctx = this.canvas.getContext('2d')!;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public setAudioLevel(lvl: number) {
    this.audioLevel = lvl;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.renderLoop();
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private renderLoop = () => {
    if (!this.isRunning) return;
    this.drawFrame();
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  };

  private drawFrame() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const time = Date.now() / 1000;

    // Studio Background with ambient neon lighting
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.4, 40, w * 0.5, h * 0.5, w * 0.6);
    grad.addColorStop(0, '#312e81'); // Indigo/violet ambient studio light
    grad.addColorStop(0.6, '#1e1b4b');
    grad.addColorStop(1, '#09090b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Studio Acoustic Foam / Wall Pattern in background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Creator Avatar subtle breathing & floating
    const breatheY = Math.sin(time * 2) * 4;
    const swayX = Math.cos(time * 1.5) * 3;
    const headX = w / 2 + swayX;
    const headY = h * 0.44 + breatheY;
    const headRadius = 90;

    // Studio Headphones Band
    ctx.save();
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(headX, headY - 10, headRadius + 14, Math.PI * 0.85, Math.PI * 2.15);
    ctx.stroke();
    ctx.restore();

    // Headphone Earcups
    const drawEarcup = (ex: number, ey: number) => {
      ctx.save();
      ctx.fillStyle = '#e11d48'; // Rose red earcups
      ctx.beginPath();
      ctx.roundRect(ex - 14, ey - 32, 28, 64, 12);
      ctx.fill();
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    };
    drawEarcup(headX - headRadius - 10, headY);
    drawEarcup(headX + headRadius + 10, headY);

    // Head circle (Friendly creator avatar)
    ctx.save();
    ctx.fillStyle = '#fde047'; // Bright stylized avatar
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Sunglasses / Glasses
    const glassW = 44;
    const glassH = 28;
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.roundRect(headX - 52, headY - 20, glassW, glassH, 8);
    ctx.roundRect(headX + 8, headY - 20, glassW, glassH, 8);
    ctx.fill();

    // Glasses bridge
    ctx.fillRect(headX - 10, headY - 12, 20, 5);

    // Sunglasses reflection shine
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(headX - 44, headY - 14);
    ctx.lineTo(headX - 22, headY + 2);
    ctx.moveTo(headX + 16, headY - 14);
    ctx.lineTo(headX + 38, headY + 2);
    ctx.stroke();

    // Animated Mouth (Opens with talking / sound level)
    const mouthOpen = 6 + Math.min(28, this.audioLevel * 40 + (Math.sin(time * 6) > 0 ? 12 : 0));
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.ellipse(headX, headY + 36, 18, mouthOpen, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Creator Shoulders / Hoodie
    ctx.save();
    ctx.fillStyle = '#4f46e5'; // Indigo Hoodie
    ctx.beginPath();
    ctx.ellipse(headX, h + 40, w * 0.38, 140, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Studio Mic in foreground
    const micX = headX + 75;
    const micY = headY + 45;
    ctx.save();
    ctx.fillStyle = '#27272a';
    ctx.beginPath();
    ctx.roundRect(micX - 16, micY - 24, 32, 50, 16);
    ctx.fill();
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Mic mesh grid
    ctx.fillStyle = '#71717a';
    ctx.beginPath();
    ctx.roundRect(micX - 12, micY - 20, 24, 20, 10);
    ctx.fill();
    ctx.restore();

    // "VIRTUAL DEMO CAM" badge at bottom
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(16, h - 42, 190, 28, 14);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillText('⚡ DEMO WEBCAM FEED', 30, h - 24);
    ctx.restore();
  }
}
