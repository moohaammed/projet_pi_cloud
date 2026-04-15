import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HeartRateRecord {
  id?: string;
  userId: number;
  deviceName: string;
  bpm: number;
  recordedAt: string; // Server-generated — only present in responses
}

@Injectable({ providedIn: 'root' })
export class HeartRateService {

  private apiUrl = 'http://localhost:8080/api/heart-rate';

  constructor(private http: HttpClient) { }

  /**
   * POST a new heart-rate reading.
   * The recordedAt timestamp is generated automatically by the server.
   */
  create(record: Omit<HeartRateRecord, 'id' | 'recordedAt'>): Observable<HeartRateRecord> {
    return this.http.post<HeartRateRecord>(this.apiUrl, record);
  }

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
}
