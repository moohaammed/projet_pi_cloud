import { Injectable } from '@angular/core';
import { Hands, Results, NormalizedLandmark } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export type GestureType = 'draw' | 'clear' | 'zoom' | 'unzoom' | 'erase' | 'none';

export interface HandGestureEvent {
  type: GestureType;
  x: number;
  y: number;
  strokeWeight: number;
  zoomFactor?: number;
  timestamp: string;
}

/** 
 * Exponential moving-average smoother for fluid writing.
 */
class EMAFilter {
  private vx: number | null = null;
  private vy: number | null = null;
  constructor(private readonly alpha: number = 0.4) { }

  smooth(x: number, y: number): { x: number; y: number } {
    if (this.vx === null) {
      this.vx = x; this.vy = y;
    } else {
      this.vx = this.alpha * x + (1 - this.alpha) * this.vx;
      this.vy = this.alpha * y + (1 - this.alpha) * this.vy!;
    }
    return { x: this.vx, y: this.vy! };
  }

  reset(): void { this.vx = null; this.vy = null; }
}

@Injectable({ providedIn: 'root' })
export class HandTrackingService {
  private hands!: Hands;
  private camera?: Camera;
  private drawFilter = new EMAFilter(0.4);
  private lastZoomDist: number | null = null;

  constructor() {}

  public async initialize(videoElement: HTMLVideoElement, onResults: (results: Results) => void) {
    this.hands = new Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.hands.setOptions({
      maxNumHands: 1, // Focus on single hand for better precision in writing
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.hands.onResults(onResults);

    this.camera = new Camera(videoElement, {
      onFrame: async () => await this.hands.send({ image: videoElement }),
      width: 640,
      height: 480
    });
    
    await this.camera.start();
  }

  public stop() {
    this.camera?.stop();
    this.drawFilter.reset();
  }

  public detectGesture(results: Results): HandGestureEvent {
    const now = new Date().toISOString();
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.drawFilter.reset();
      return { type: 'none', x: 0, y: 0, strokeWeight: 2, timestamp: now };
    }

    const lm = results.multiHandLandmarks[0];
    const indexTip = lm[8];
    const indexPip = lm[6];
    const middleTip = lm[12];
    const middlePip = lm[10];
    const thumbTip = lm[4];

    // Helper: is finger extended? (Tip y < PIP y in MediaPipe coords where 0 is top)
    const isIndexUp = indexTip.y < indexPip.y;
    const isMiddleUp = middleTip.y < middlePip.y;

    // 1. CLEAR: Index marker far right (Doctor's view)
    if (indexTip.x > 0.92) {
      return { type: 'clear', x: indexTip.x, y: indexTip.y, strokeWeight: 2, timestamp: now };
    }

    // 2. ERASE: Pinch (Thumb + Index close)
    const pinchDist = Math.sqrt(Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2));
    if (pinchDist < 0.06) {
      this.drawFilter.reset();
      return { type: 'erase', x: indexTip.x, y: indexTip.y, strokeWeight: 2, timestamp: now };
    }

    // 3. DRAW: Index UP and Middle DOWN (Natural "Pen" position)
    if (isIndexUp && !isMiddleUp) {
      const smoothed = this.drawFilter.smooth(indexTip.x, indexTip.y);
      return { type: 'draw', x: smoothed.x, y: smoothed.y, strokeWeight: 2, timestamp: now };
    }

    // Default: Reset filter if not drawing
    this.drawFilter.reset();
    return { type: 'none', x: indexTip.x, y: indexTip.y, strokeWeight: 2, timestamp: now };
  }
}