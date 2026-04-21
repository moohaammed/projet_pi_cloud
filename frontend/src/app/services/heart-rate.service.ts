import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HeartRateRecord {
  id?: string;
  eventId?: string;
  userId: number;
  deviceName: string;
  bpm: number;
  source?: string;
  capturedAt?: string;
  receivedAt?: string;
  recordedAt: string; // Legacy field — kept for backward compatibility
}

@Injectable({ providedIn: 'root' })
export class HeartRateService {

  private apiUrl = 'http://localhost:8080/api/heart-rate';

  constructor(private http: HttpClient) { }

  /**
   * GET the most recent heart-rate reading for a user.
   */
  getLatest(userId: number): Observable<HeartRateRecord> {
    return this.http.get<HeartRateRecord>(`${this.apiUrl}/latest/${userId}`);
  }

  /**
   * GET the full heart-rate history for a user.
   */
  getHistory(userId: number): Observable<HeartRateRecord[]> {
    return this.http.get<HeartRateRecord[]>(`${this.apiUrl}/history/${userId}`);
  }

  /**
   * GET a specific heart-rate record by MongoDB ID.
   */
  getById(id: string): Observable<HeartRateRecord> {
    return this.http.get<HeartRateRecord>(`${this.apiUrl}/${id}`);
  }

  /**
   * DELETE a specific heart-rate record.
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Connect to the live SSE stream for real-time heart-rate events.
   * Returns an Observable that emits HeartRateRecord objects
   * as they arrive from the Kafka-backed streaming pipeline.
   *
   * @param userId optional — if provided, only events for this user are streamed.
   */
  connectLiveStream(userId?: number): Observable<HeartRateRecord> {
    return new Observable(observer => {
      const url = userId != null
        ? `${this.apiUrl}/stream?userId=${userId}`
        : `${this.apiUrl}/stream`;
      const eventSource = new EventSource(url);

      eventSource.addEventListener('heartrate', (event: any) => {
        try {
          const data = JSON.parse(event.data);
          observer.next(data);
        } catch (e) {
          console.error('[SSE] Failed to parse event:', e);
        }
      });

      eventSource.onerror = (error) => {
        console.warn('[SSE] Connection error, will auto-reconnect:', error);
        // EventSource auto-reconnects by default.
        // Only complete the observable if the connection is fully closed.
        if (eventSource.readyState === EventSource.CLOSED) {
          observer.error('SSE connection closed');
          eventSource.close();
        }
      };

      // Cleanup: close EventSource when unsubscribed
      return () => {
        console.log('[SSE] Closing connection');
        eventSource.close();
      };
    });
  }
}
