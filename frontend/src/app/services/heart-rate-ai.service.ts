import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HeartRateAiResult {
  userId: number;
  status: 'WAITING' | 'READY' | 'ERROR';
  readingsCollected: number;
  readingsRequired: number;
  prediction?: string;
  probability?: number;
  riskLevel?: string;
  action?: string;
  bpmCurrent?: number;
  bpmMean?: number;
  errorMessage?: string;
  timestamp?: string;
}

@Injectable({ providedIn: 'root' })
export class HeartRateAiService {

  private apiUrl = 'http://localhost:8080/api/heart-rate/ai';

  constructor(private http: HttpClient) { }

  /**
   * GET the current AI state for a user (polling fallback).
   */
  getState(userId: number): Observable<HeartRateAiResult> {
    return this.http.get<HeartRateAiResult>(`${this.apiUrl}/state/${userId}`);
  }

  /**
   * Connect to the live SSE stream for real-time AI prediction events.
   * Returns an Observable that emits HeartRateAiResult objects
   * as they arrive from the AI prediction pipeline.
   */
  connectAiStream(userId?: number): Observable<HeartRateAiResult> {
    return new Observable(observer => {
      const url = userId != null
        ? `${this.apiUrl}/stream?userId=${userId}`
        : `${this.apiUrl}/stream`;
      const eventSource = new EventSource(url);

      eventSource.addEventListener('ai-prediction', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          observer.next(data);
        } catch (e) {
          console.error('[AI SSE] Failed to parse event:', e);
        }
      });

      eventSource.onerror = (error) => {
        console.warn('[AI SSE] Connection error, will auto-reconnect:', error);
        if (eventSource.readyState === EventSource.CLOSED) {
          observer.error('AI SSE connection closed');
          eventSource.close();
        }
      };

      return () => {
        console.log('[AI SSE] Closing connection');
        eventSource.close();
      };
    });
  }
}
