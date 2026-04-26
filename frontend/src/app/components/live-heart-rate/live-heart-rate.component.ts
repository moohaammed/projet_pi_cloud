import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  PLATFORM_ID,
  Inject,
  NgZone,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HeartRateService, HeartRateRecord } from '../../services/heart-rate.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-live-heart-rate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-heart-rate.component.html',
  styleUrls: ['./live-heart-rate.component.css']
})
export class LiveHeartRateComponent implements OnInit, OnDestroy {

  currentBpm: number | null = null;
  deviceName: string = '—';
  lastRecordedAt: string = '';
  status: 'connected' | 'disconnected' = 'disconnected';
  history: HeartRateRecord[] = [];
  bpmHistory: number[] = [];

  // ECG waveform data
  ecgPoints: string = '';
  private ecgData: number[] = [];
  private readonly ECG_MAX_POINTS = 200;

  private sseSubscription: Subscription | null = null;
  private reconnectTimeout: any = null;
  private isBrowser: boolean;

  private userId: number = 1; // TODO: Replace with authenticated user ID

  // Inactivity detection: if no heart-rate event arrives within this many ms, mark as disconnected
  private readonly INACTIVITY_TIMEOUT_MS = 5000;
  private lastEventTimestamp: number = 0;
  private inactivityIntervalId: any = null;

  @ViewChild('ecgCanvas', { static: false }) ecgCanvas!: ElementRef<HTMLCanvasElement>;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number = 0;

  constructor(
    private heartRateService: HeartRateService,
    private authService: AuthService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    // Try to get logged-in user ID
    const user = this.authService.getCurrentUser();
    if (user && user.id) {
      this.userId = user.id;
    }

    // Initialize ECG data with zeros
    this.ecgData = new Array(this.ECG_MAX_POINTS).fill(0);

    // Connect to the live SSE stream
    this.connectToLiveStream();

    // Load history from MongoDB (one-time)
    this.loadHistory();

    // Start ECG canvas animation
    setTimeout(() => this.initCanvas(), 100);

    // Start inactivity checker — runs every second
    this.startInactivityChecker();
  }

  ngOnDestroy(): void {
    if (this.sseSubscription) {
      this.sseSubscription.unsubscribe();
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.inactivityIntervalId) {
      clearInterval(this.inactivityIntervalId);
    }
  }

  /**
   * Periodically checks whether we have received a heart-rate event recently.
   * If more than INACTIVITY_TIMEOUT_MS has passed since the last event,
   * the device is marked as disconnected. As soon as a new event arrives
   * (handled in connectToLiveStream), the status flips back to 'connected'.
   */
  private startInactivityChecker(): void {
    this.inactivityIntervalId = setInterval(() => {
      if (
        this.lastEventTimestamp > 0 &&
        Date.now() - this.lastEventTimestamp >= this.INACTIVITY_TIMEOUT_MS &&
        this.status !== 'disconnected'
      ) {
        console.log('[LIVE] No heart-rate event for 5 s — marking device as disconnected');

        this.status = 'disconnected';
        this.currentBpm = null;          // clear stale BPM from center display
        this.deviceName = 'Disconnected';
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  /**
   * Connect to the SSE live stream from the Heart Beat service.
   * Passes the current userId so the server only streams events for this user.
   * Replaces the old 2-second polling mechanism with real-time push.
   */
  private connectToLiveStream(): void {
    console.log(`[LIVE] Connecting to SSE stream for userId=${this.userId}...`);

    this.sseSubscription = this.heartRateService.connectLiveStream(this.userId).subscribe({
      next: (event: any) => {
        this.ngZone.run(() => {
          console.log('[LIVE] Received heart-rate event:', event);

          this.currentBpm = event.bpm;
          this.deviceName = event.deviceName || '—';
          this.lastRecordedAt = event.receivedAt || event.capturedAt || '';
          this.status = 'connected';
          this.lastEventTimestamp = Date.now();

          // Push to ECG waveform
          this.pushEcgData(event.bpm);

          // Update BPM sparkline history
          this.bpmHistory.push(event.bpm);
          if (this.bpmHistory.length > 30) {
            this.bpmHistory.shift();
          }

          // Prepend to history display (newest first)
          const record: HeartRateRecord = {
            eventId: event.eventId,
            userId: event.userId,
            deviceName: event.deviceName,
            bpm: event.bpm,
            source: event.source,
            capturedAt: event.capturedAt,
            receivedAt: event.receivedAt,
            recordedAt: event.receivedAt || ''
          };

          this.history.unshift(record);
          if (this.history.length > 50) {
            this.history.pop();
          }

          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.warn('[LIVE] SSE stream error:', err);

          this.status = 'disconnected';
          this.currentBpm = null;        // clear stale BPM on stream error too
          this.deviceName = 'Disconnected';
          this.cdr.detectChanges();
        });

        // Auto-reconnect after 3 seconds
        this.reconnectTimeout = setTimeout(() => {
          console.log('[LIVE] Attempting SSE reconnect...');
          this.connectToLiveStream();
        }, 3000);
      }
    });
  }

  private loadHistory(): void {
    this.heartRateService.getHistory(this.userId).subscribe({
      next: (records) => {
        if (records) {
          this.history = records.slice(0, 50); // Show last 50 records
        }
      },
      error: () => {
        this.history = [];
      }
    });
  }

  private pushEcgData(bpm: number): void {
    // Generate a synthetic ECG-like waveform segment based on BPM
    const amplitude = Math.min(bpm / 200, 1);
    const segment = this.generateEcgSegment(amplitude);

    for (const val of segment) {
      this.ecgData.push(val);
      if (this.ecgData.length > this.ECG_MAX_POINTS) {
        this.ecgData.shift();
      }
    }
  }

  private generateEcgSegment(amplitude: number): number[] {
    // Simplified PQRST waveform
    const seg: number[] = [];
    const steps = 20;

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      let v = 0;

      // P wave
      if (t >= 0.0 && t < 0.1) v = amplitude * 0.15 * Math.sin(Math.PI * t / 0.1);
      // PR segment
      else if (t >= 0.1 && t < 0.2) v = 0;
      // QRS complex
      else if (t >= 0.2 && t < 0.25) v = -amplitude * 0.15;
      else if (t >= 0.25 && t < 0.35) v = amplitude * (1.0 - Math.abs(t - 0.3) / 0.05 * 0.3);
      else if (t >= 0.35 && t < 0.4) v = -amplitude * 0.2;
      // ST segment
      else if (t >= 0.4 && t < 0.5) v = 0;
      // T wave
      else if (t >= 0.5 && t < 0.7) v = amplitude * 0.3 * Math.sin(Math.PI * (t - 0.5) / 0.2);
      // Baseline
      else v = 0;

      seg.push(v);
    }

    return seg;
  }

  private initCanvas(): void {
    if (!this.ecgCanvas) return;
    const canvas = this.ecgCanvas.nativeElement;
    this.canvasCtx = canvas.getContext('2d');
    this.drawEcg();
  }

  private drawEcg(): void {
    if (!this.canvasCtx || !this.ecgCanvas) {
      this.animationFrameId = requestAnimationFrame(() => this.drawEcg());
      return;
    }

    const canvas = this.ecgCanvas.nativeElement;
    const ctx = this.canvasCtx;
    const w = canvas.width;
    const h = canvas.height;
    const midY = h / 2;

    // Clear
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, w, h);

    // Draw grid
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.07)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw ECG line
    if (this.ecgData.length < 2) {
      this.animationFrameId = requestAnimationFrame(() => this.drawEcg());
      return;
    }

    const stepX = w / (this.ECG_MAX_POINTS - 1);
    const scaleY = h * 0.4;

    // Glow effect
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < this.ecgData.length; i++) {
      const x = i * stepX;
      const y = midY - this.ecgData[i] * scaleY;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw leading dot
    const lastIdx = this.ecgData.length - 1;
    const dotX = lastIdx * stepX;
    const dotY = midY - this.ecgData[lastIdx] * scaleY;
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    this.animationFrameId = requestAnimationFrame(() => this.drawEcg());
  }

  getBpmClass(): string {
    if (!this.currentBpm) return '';
    if (this.currentBpm < 60) return 'bpm-low';
    if (this.currentBpm > 100) return 'bpm-high';
    return 'bpm-normal';
  }

  getBpmZone(): string {
    if (!this.currentBpm) return 'Disconnected';
    if (this.currentBpm < 60) return 'Bradycardia';
    if (this.currentBpm <= 100) return 'Normal State';
    return 'Tachycardia';
  }

  getAverageBpm(): number {
    if (this.bpmHistory.length === 0) return 0;
    return Math.round(this.bpmHistory.reduce((a, b) => a + b, 0) / this.bpmHistory.length);
  }

  getMinBpm(): number {
    if (this.bpmHistory.length === 0) return 0;
    return Math.min(...this.bpmHistory);
  }

  getMaxBpm(): number {
    if (this.bpmHistory.length === 0) return 0;
    return Math.max(...this.bpmHistory);
  }

  formatTimestamp(ts: string): string {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return ts;
    }
  }
}