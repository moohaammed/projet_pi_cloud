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
import { HeartRateAiService, HeartRateAiResult } from '../../services/heart-rate-ai.service';
import { AuthService } from '../../services/auth.service';
import { HeartRateAccessService, MonitoredPatient } from '../../services/heart-rate-access.service';
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
  isResolvingPatient = false;
  relationUnlinked = false;
  monitoredPatient: MonitoredPatient | null = null;
  linkedPatients: MonitoredPatient[] = [];
  currentUserRole = '';
  isPreparingSmartwatch = false;
  smartwatchTokenMessage = '';
  smartwatchTokenError = '';

  // ECG waveform data
  ecgPoints: string = '';
  private ecgData: number[] = [];
  private readonly ECG_MAX_POINTS = 200;

  // ─── AI Prediction State ──────────────────────────────────────
  aiResult: HeartRateAiResult | null = null;
  /** 'waiting' | 'ready' | 'disconnected' | 'error' | 'idle' */
  aiStatus: string = 'idle';

  private sseSubscription: Subscription | null = null;
  private aiSseSubscription: Subscription | null = null;
  private reconnectTimeout: any = null;
  private aiReconnectTimeout: any = null;
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
    private heartRateAiService: HeartRateAiService,
    private authService: AuthService,
    private heartRateAccessService: HeartRateAccessService,
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
    this.currentUserRole = user?.role || '';
    if (user && user.id) {
      this.userId = user.id;
    }

    // Initialize ECG data with zeros
    this.ecgData = new Array(this.ECG_MAX_POINTS).fill(0);

    if (user?.role === 'RELATION') {
      this.resolveRelationPatient(user.id);
      return;
    }

    this.initializeMonitoring();
  }

  connectSmartwatch(): void {
    if (!this.isBrowser || this.isPreparingSmartwatch) {
      return;
    }

    this.smartwatchTokenMessage = '';
    this.smartwatchTokenError = '';

    const user = this.authService.getCurrentUser();
    const patientUserId = Number(user?.id || this.userId);
    if (!patientUserId) {
      this.smartwatchTokenError = 'Could not resolve the logged-in patient.';
      return;
    }

    this.isPreparingSmartwatch = true;
    this.heartRateService.generateSmartwatchToken(patientUserId).subscribe({
      next: (response) => {
        const config = {
          ingestUrl: this.heartRateService.getIngestUrl(),
          token: response.token,
          expiresAt: response.expiresAt,
          deviceName: 'ST2',
          watchNameKeyword: 'ST2',
          characteristicUuid: '000033f2-0000-1000-8000-00805f9b34fb',
          source: 'BLE_CLIENT_TOKEN'
        };

        this.downloadSmartwatchConfig(config);
        this.smartwatchTokenMessage = `Config downloaded. Token expires at ${this.formatTimestamp(response.expiresAt)}.`;
        this.isPreparingSmartwatch = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.smartwatchTokenError = 'Could not prepare smartwatch connection.';
        this.isPreparingSmartwatch = false;
        this.cdr.detectChanges();
      }
    });
  }

  private downloadSmartwatchConfig(config: Record<string, unknown>): void {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'medisync-smartwatch-config.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  private initializeMonitoring(): void {
    this.isResolvingPatient = false;
    this.relationUnlinked = false;
    this.stopLiveSubscriptions();

    // Connect to the live SSE stream
    this.connectToLiveStream();

    // Connect to the AI SSE stream
    this.connectToAiStream();

    // Load history from MongoDB (one-time)
    this.loadHistory();

    // Start ECG canvas animation
    setTimeout(() => this.initCanvas(), 100);

    // Start inactivity checker — runs every second
    this.startInactivityChecker();
  }

  private resolveRelationPatient(relationUserId: number): void {
    this.isResolvingPatient = true;
    this.heartRateAccessService.getRelationPatients(relationUserId).subscribe({
      next: (patients) => {
        this.linkedPatients = (patients || []).filter(patient => typeof patient.userId === 'number');
        if (this.linkedPatients.length === 0) {
          this.showRelationUnlinkedState();
          return;
        }

        this.selectLinkedPatient(this.linkedPatients[0]);
      },
      error: () => this.showRelationUnlinkedState()
    });
  }

  selectLinkedPatient(patient: MonitoredPatient): void {
    if (typeof patient.userId !== 'number') {
      return;
    }

    this.monitoredPatient = patient;
    this.userId = patient.userId;
    this.resetLiveDisplayState();
    this.initializeMonitoring();
  }

  private showRelationUnlinkedState(): void {
    this.isResolvingPatient = false;
    this.relationUnlinked = true;
    this.status = 'disconnected';
    this.currentBpm = null;
    this.deviceName = 'Disconnected';
    this.aiStatus = 'disconnected';
    this.aiResult = null;
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.stopLiveSubscriptions();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private stopLiveSubscriptions(): void {
    if (this.sseSubscription) {
      this.sseSubscription.unsubscribe();
      this.sseSubscription = null;
    }
    if (this.aiSseSubscription) {
      this.aiSseSubscription.unsubscribe();
      this.aiSseSubscription = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.aiReconnectTimeout) {
      clearTimeout(this.aiReconnectTimeout);
      this.aiReconnectTimeout = null;
    }
    if (this.inactivityIntervalId) {
      clearInterval(this.inactivityIntervalId);
      this.inactivityIntervalId = null;
    }
  }

  private resetLiveDisplayState(): void {
    this.currentBpm = null;
    this.deviceName = 'Disconnected';
    this.lastRecordedAt = '';
    this.status = 'disconnected';
    this.history = [];
    this.bpmHistory = [];
    this.aiResult = null;
    this.aiStatus = 'idle';
    this.lastEventTimestamp = 0;
    this.ecgData = new Array(this.ECG_MAX_POINTS).fill(0);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  /**
   * Periodically checks whether we have received a heart-rate event recently.
   * If more than INACTIVITY_TIMEOUT_MS has passed since the last event,
   * the device is marked as disconnected. As soon as a new event arrives
   * (handled in connectToLiveStream), the status flips back to 'connected'.
   */
private startInactivityChecker(): void {
  if (this.inactivityIntervalId) {
    clearInterval(this.inactivityIntervalId);
  }
  this.inactivityIntervalId = setInterval(() => {
    if (
      this.lastEventTimestamp > 0 &&
      Date.now() - this.lastEventTimestamp >= this.INACTIVITY_TIMEOUT_MS &&
      this.status !== 'disconnected'
    ) {
      console.log('[LIVE] No heart-rate event for 5 s — marking device as disconnected');

      // Heart-rate UI
      this.status = 'disconnected';
      this.currentBpm = null;
      this.deviceName = 'Disconnected';

      // AI UI must also go disconnected live
      this.aiStatus = 'disconnected';
      this.aiResult = null;

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

        // If the watch was previously disconnected, AI should leave disconnected state
        // and wait for the next fresh AI prediction.
        if (this.aiStatus === 'disconnected') {
          this.aiStatus = 'waiting';
          this.aiResult = null;
        }

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

        // Heart-rate UI
        this.status = 'disconnected';
        this.currentBpm = null;
        this.deviceName = 'Disconnected';

        // AI UI must also go disconnected
        this.aiStatus = 'disconnected';
        this.aiResult = null;

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

  /**
   * Connect to the AI prediction SSE stream.
   */
private connectToAiStream(): void {
  console.log(`[AI] Connecting to AI SSE stream for userId=${this.userId}...`);

  this.aiSseSubscription = this.heartRateAiService.connectAiStream(this.userId).subscribe({
    next: (result: HeartRateAiResult) => {
      this.ngZone.run(() => {
        console.log('[AI] Received AI prediction:', result);

        // If watch is disconnected, AI section must stay disconnected
        if (this.status === 'disconnected') {
          this.aiStatus = 'disconnected';
          this.aiResult = null;
          this.cdr.detectChanges();
          return;
        }

        this.aiResult = result;

        switch (result.status) {
          case 'WAITING':
            this.aiStatus = 'waiting';
            break;
          case 'READY':
            this.aiStatus = 'ready';
            break;
          case 'ERROR':
            this.aiStatus = 'error';
            break;
          default:
            this.aiStatus = 'idle';
        }

        this.cdr.detectChanges();
      });
    },
    error: (err) => {
      this.ngZone.run(() => {
        console.warn('[AI] AI SSE stream error:', err);

        // If the watch is disconnected, keep AI as disconnected.
        // Otherwise show AI error state.
        if (this.status === 'disconnected') {
          this.aiStatus = 'disconnected';
          this.aiResult = null;
        } else {
          this.aiStatus = 'error';
        }

        this.cdr.detectChanges();
      });

      // Auto-reconnect after 5 seconds
      this.aiReconnectTimeout = setTimeout(() => {
        console.log('[AI] Attempting AI SSE reconnect...');
        this.connectToAiStream();
      }, 5000);
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

  getMonitoredPatientName(): string {
    if (!this.monitoredPatient) return '';
    return `${this.monitoredPatient.prenom || ''} ${this.monitoredPatient.nom || ''}`.trim();
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

  // ─── AI display helpers ────────────────────────────────────────

  getAiProgressPercent(): number {
    if (!this.aiResult) return 0;
    return Math.round((this.aiResult.readingsCollected / this.aiResult.readingsRequired) * 100);
  }

  getAiRiskColor(): string {
    if (!this.aiResult || this.aiResult.status !== 'READY') return '#6b7280';
    switch (this.aiResult.riskLevel) {
      case 'NORMAL': return '#00ff88';
      case 'ATTENTION': return '#fbbf24';
      case 'SURVEILLANCE': return '#f97316';
      case 'ALERTE': return '#ef4444';
      default: return '#6b7280';
    }
  }

  getAiRiskIcon(): string {
    if (!this.aiResult || this.aiResult.status !== 'READY') return 'fa-circle-question';
    switch (this.aiResult.riskLevel) {
      case 'NORMAL': return 'fa-circle-check';
      case 'ATTENTION': return 'fa-triangle-exclamation';
      case 'SURVEILLANCE': return 'fa-eye';
      case 'ALERTE': return 'fa-bell';
      default: return 'fa-circle-question';
    }
  }

  getAiProbabilityPercent(): number {
    if (!this.aiResult || this.aiResult.probability == null) return 0;
    return Math.round(this.aiResult.probability * 100);
  }
}
