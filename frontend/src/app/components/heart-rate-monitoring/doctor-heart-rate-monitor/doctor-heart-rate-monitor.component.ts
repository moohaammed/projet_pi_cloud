import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { HeartRateAccessService, MonitoredPatient } from '../../../services/heart-rate-access.service';
import { HeartRateLiveState, HeartRateService } from '../../../services/heart-rate.service';
import { HeartRateLiveStateService } from '../../../services/heart-rate-live-state.service';

@Component({
  selector: 'app-doctor-heart-rate-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doctor-heart-rate-monitor.component.html',
  styleUrl: '../shared-heart-rate-monitor.css'
})
export class DoctorHeartRateMonitorComponent implements OnInit, OnDestroy {
  patients: MonitoredPatient[] = [];
  states = new Map<number, HeartRateLiveState>();
  isLoading = false;
  errorMessage = '';

  private streamSubscription: Subscription | null = null;
  private inactivityIntervalId: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly inactivityTimeoutMs = 5000;

  constructor(
    private authService: AuthService,
    private accessService: HeartRateAccessService,
    private heartRateService: HeartRateService,
    private liveStateService: HeartRateLiveStateService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPatients();
  }

  ngOnDestroy(): void {
    this.streamSubscription?.unsubscribe();
    if (this.inactivityIntervalId) {
      clearInterval(this.inactivityIntervalId);
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }

  loadPatients(): void {
    const user = this.authService.getCurrentUser();
    if (!user?.id) {
      this.errorMessage = 'Unable to identify the connected doctor.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.accessService.getDoctorPatients(user.id).subscribe({
      next: patients => {
        this.patients = patients || [];
        this.isLoading = false;
        this.loadStatesAndStream();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Unable to load assigned patients.';
      }
    });
  }

  get connectedCount(): number {
    return this.patients.filter(patient => this.isConnected(patient)).length;
  }

  get offlineCount(): number {
    return Math.max(this.patients.length - this.connectedCount, 0);
  }

  trackByPatientId(_index: number, patient: MonitoredPatient): number {
    return patient.patientId;
  }

  getPatientName(patient: MonitoredPatient): string {
    return `${patient.prenom || ''} ${patient.nom || ''}`.trim() || `Patient #${patient.patientId}`;
  }

  getState(patient: MonitoredPatient): HeartRateLiveState | undefined {
    return typeof patient.userId === 'number' ? this.states.get(patient.userId) : undefined;
  }

  isConnected(patient: MonitoredPatient): boolean {
    const state = this.getState(patient);
    return !!state?.connected && !this.isStateStale(state);
  }

  getBpm(patient: MonitoredPatient): string {
    const state = this.getState(patient);
    return this.isConnected(patient) && state?.bpm != null ? String(state.bpm) : '--';
  }

  getZone(patient: MonitoredPatient): string {
    const state = this.getState(patient);
    if (!this.isConnected(patient)) {
      return 'Disconnected';
    }
    return this.liveStateService.formatZone(state?.zone, state?.bpm);
  }

  getLastReceived(patient: MonitoredPatient): string {
    const state = this.getState(patient);
    return this.formatTimestamp(state?.lastReceivedAt || state?.receivedAt || '');
  }

  getBpmClass(patient: MonitoredPatient): string {
    const bpm = this.getState(patient)?.bpm;
    if (!this.isConnected(patient) || bpm == null) {
      return 'offline';
    }
    if (bpm < 60) {
      return 'low';
    }
    if (bpm > 100) {
      return 'high';
    }
    return 'normal';
  }

  private loadStatesAndStream(): void {
    const userIds = this.getPatientUserIds();
    this.streamSubscription?.unsubscribe();
    this.states.clear();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (userIds.length === 0) {
      return;
    }

    this.heartRateService.getStates(userIds).subscribe({
      next: states => {
        for (const state of states || []) {
          this.states.set(state.userId, this.liveStateService.hydrateState(state));
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Unable to load current heart-rate states.';
      }
    });

    this.streamSubscription = this.heartRateService.connectLiveStream(userIds).subscribe({
      next: event => {
        this.ngZone.run(() => {
          this.states.set(event.userId, this.liveStateService.toLiveState(event));
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.errorMessage = 'Live heart-rate stream disconnected. Reconnecting...';
          this.cdr.detectChanges();
        });
        this.scheduleReconnect();
      }
    });

    this.startInactivityChecker();
  }

  private startInactivityChecker(): void {
    if (this.inactivityIntervalId) {
      clearInterval(this.inactivityIntervalId);
    }
    this.inactivityIntervalId = setInterval(() => {
      let changed = false;
      for (const [userId, state] of this.states.entries()) {
        if (state.connected && this.isStateStale(state)) {
          this.states.set(userId, this.liveStateService.markDisconnected(state));
          changed = true;
        }
      }
      if (changed) {
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  private getPatientUserIds(): number[] {
    return this.patients
      .map(patient => patient.userId)
      .filter((userId): userId is number => typeof userId === 'number');
  }

  private isStateStale(state: HeartRateLiveState): boolean {
    return this.liveStateService.isStateStale(state, this.inactivityTimeoutMs);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.loadStatesAndStream();
    }, 3000);
  }

  private formatTimestamp(value: string): string {
    if (!value) {
      return '--';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}
