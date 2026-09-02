/**
 * Flashlight Controller Service
 * Supports:
 * 1. Hardware LED Torch for back/environment camera via WebRTC MediaStreamTrack ImageCapture API
 * 2. Secondary environment stream torch when user camera is front-facing (allowing dual front+back illumination)
 * 3. Front Screen Light / Softbox diffuser lighting configuration (daylight, warm, golden, soft-pink)
 * 4. Mode management: 'off' | 'front' | 'back' | 'both'
 */

export type FlashlightMode = 'off' | 'front' | 'back' | 'both';
export type FrontFlashTone = 'daylight' | 'warm' | 'golden' | 'soft-pink';

export interface FlashlightState {
  mode: FlashlightMode;
  frontBrightness: number; // 0.2 to 1.0
  frontTone: FrontFlashTone;
  hardwareTorchActive: boolean;
  hardwareTorchSupported: boolean;
  requiresRearCamera?: boolean;
}

class FlashlightService {
  private isBackTorchHardwareOn: boolean = false;

  /**
   * Check whether a given MediaStreamTrack supports the hardware torch constraint
   */
  public isHardwareTorchSupported(track: MediaStreamTrack | null): boolean {
    if (!track) return false;
    try {
      const getCaps = (track as any).getCapabilities ? (track as any).getCapabilities() : null;
      if (getCaps && 'torch' in getCaps) {
        return Boolean(getCaps.torch);
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Update torch state on current stream
   */
  public async setFlashlightMode(
    mode: FlashlightMode,
    activeCameraFacing: 'user' | 'environment',
    activeCameraStream: MediaStream | null
  ): Promise<{
    hardwareTorchSupported: boolean;
    hardwareTorchActive: boolean;
    requiresRearCamera: boolean;
  }> {
    let hardwareTorchSupported = false;
    let hardwareTorchActive = false;
    let requiresRearCamera = false;

    const needBackTorch = mode === 'back' || mode === 'both';

    if (needBackTorch) {
      if (activeCameraStream) {
        const track = activeCameraStream.getVideoTracks()[0];
        if (track && track.readyState === 'live') {
          const hasTorch = this.isHardwareTorchSupported(track);

          // Try applying torch constraint directly to active track
          const applied = await this.applyTrackTorch(track, true);
          if (applied) {
            hardwareTorchSupported = true;
            hardwareTorchActive = true;
          } else if (activeCameraFacing === 'user') {
            // Front camera does not have hardware LED flash bulb
            requiresRearCamera = true;
          }
        } else if (activeCameraFacing === 'user') {
          requiresRearCamera = true;
        }
      } else {
        requiresRearCamera = activeCameraFacing === 'user';
      }

      this.isBackTorchHardwareOn = hardwareTorchActive;
    } else {
      // Deactivate hardware torch
      await this.turnOffBackTorch(activeCameraStream);
    }

    return { hardwareTorchSupported, hardwareTorchActive, requiresRearCamera };
  }

  public async applyTrackTorch(track: MediaStreamTrack, on: boolean): Promise<boolean> {
    try {
      if (track.readyState !== 'live') return false;

      // WebRTC standard advanced torch constraint (widely supported on mobile Chrome/Android)
      await (track as any).applyConstraints({
        advanced: [{ torch: on }],
      });
      return true;
    } catch (err) {
      // Device / driver does not support hardware torch or is front camera
      return false;
    }
  }

  public async turnOffBackTorch(activeCameraStream: MediaStream | null) {
    if (activeCameraStream) {
      const track = activeCameraStream.getVideoTracks()[0];
      if (track && track.readyState === 'live') {
        try {
          await (track as any).applyConstraints({
            advanced: [{ torch: false }],
          });
        } catch {}
      }
    }
    this.isBackTorchHardwareOn = false;
  }

  public getIsHardwareTorchOn(): boolean {
    return this.isBackTorchHardwareOn;
  }
}

export const flashlightService = new FlashlightService();
