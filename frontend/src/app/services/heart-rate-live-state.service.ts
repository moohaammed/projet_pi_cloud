import { Injectable } from '@angular/core';
import { HeartRateLiveState, HeartRateRecord } from './heart-rate.service';

@Injectable({ providedIn: 'root' })
export class HeartRateLiveStateService {
  toLiveState(event: HeartRateRecord): HeartRateLiveState {
    const displayTimestamp = this.getDisplayTimestamp(event) || new Date().toISOString();

    return {
      eventId: event.eventId,
      userId: event.userId,
      deviceName: event.deviceName,
      bpm: event.bpm,
      source: event.source,
      capturedAt: event.capturedAt,
      receivedAt: event.receivedAt,
      lastReceivedAt: displayTimestamp,
      lastSeenAtMs: Date.now(),
      connected: true,
      zone: this.resolveZone(event.bpm)
    };
  }

  hydrateState(state: HeartRateLiveState): HeartRateLiveState {
    if (!state.connected) {
      return state;
    }
    return {
      ...state,
      lastSeenAtMs: Date.now()
    };
  }

  markDisconnected(state: HeartRateLiveState): HeartRateLiveState {
    return {
      ...state,
      connected: false,
      zone: 'DISCONNECTED'
    };
  }

  isStateStale(state: HeartRateLiveState, timeoutMs: number): boolean {
    if (!state.connected) {
      return true;
    }

    const lastSeenAt = state.lastSeenAtMs ?? this.parseTimestamp(state.lastReceivedAt || state.receivedAt);
    if (lastSeenAt == null) {
      return false;
    }

    return Date.now() - lastSeenAt >= timeoutMs;
  }

  formatZone(zone?: string, bpm?: number | null): string {
    if (zone && zone !== 'DISCONNECTED') {
      return zone.charAt(0) + zone.slice(1).toLowerCase();
    }
    if (bpm == null) {
      return 'Disconnected';
    }
    return this.resolveZone(bpm).toLowerCase();
  }

  resolveZone(bpm?: number | null): string {
    if (bpm == null) {
      return 'DISCONNECTED';
    }
    if (bpm < 60) {
      return 'BRADYCARDIA';
    }
    if (bpm <= 100) {
      return 'NORMAL';
    }
    return 'TACHYCARDIA';
  }

  private getDisplayTimestamp(event: HeartRateRecord): string {
    return event.receivedAt || event.capturedAt || event.recordedAt || '';
  }

  private parseTimestamp(value?: string): number | null {
    if (!value) {
      return null;
    }
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
  }
}
