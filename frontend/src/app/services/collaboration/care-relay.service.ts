import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * The AI-generated handover summary for a group.
 * Returned by GET /api/care-relay/handover.
 *
 * summary          — AI narrative of what happened in the group during the shift
 * criticalAlerts   — messages flagged as urgent (high distress or emergency keywords)
 * pendingTasks     — unanswered questions from the period
 * averageSentiment — mean sentiment score of all messages in the period [-1.0, +1.0]
 * totalMessages    — how many messages were analyzed
 * totalPublications — how many posts were included
 * pollCount        — number of polls created during the period
 */
export interface HandoverDTO {
  summary: string;
  criticalAlerts: string[];
  pendingTasks: string[];
  averageSentiment: number;
  totalMessages: number;
  totalPublications: number;
  pollCount: number;
}

/**
 * Angular service for the Care Relay (AI handover summary) feature.
 *
 * The Care Relay generates a shift handover summary for caregivers.
 * When a caregiver's shift ends, they request a summary of what happened
 * in a group during the last N hours.
 *
 * State management:
 *   handover signal — the currently loaded handover summary (null when not loaded)
 *   loading signal  — true while the HTTP request is in progress
 *
 * The messenger component uses loadHandover() to populate the sidebar panel.
 * clearHandover() is called when the panel is closed.
 */
@Injectable({ providedIn: 'root' })
export class CareRelayService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/care-relay';

  /** The currently loaded handover summary — null when not loaded or cleared */
  handover = signal<HandoverDTO | null>(null);

  /** True while the handover request is in progress */
  loading = signal(false);

  /** Returns an Observable of the handover summary (used when you need the raw Observable) */
  fetchHandover(groupId: string, hours: number = 8): Observable<HandoverDTO> {
    return this.http.get<HandoverDTO>(`${this.apiUrl}/handover?groupId=${groupId}&hours=${hours}`);
  }

  /**
   * Loads the handover summary and stores it in the handover signal.
   * Sets loading to true while the request is in progress.
   * Called by the messenger component when the user opens the AI Relay panel.
   */
  loadHandover(groupId: string, hours: number = 8) {
    this.loading.set(true);
    this.fetchHandover(groupId, hours).subscribe({
      next: (dto) => {
        this.handover.set(dto);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  /** Clears the handover signal — called when the panel is closed */
  clearHandover() {
    this.handover.set(null);
  }
}
