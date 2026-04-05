import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CareBotService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/carebot/test';

  /**
   * Same reminder as the scheduled 8:00 AM job. Pass userId to target only that patient (must be PATIENT role).
   */
  triggerMedicationReminder(userId?: number): Observable<string> {
    let params = new HttpParams();
    if (userId != null) {
      params = params.set('userId', String(userId));
    }
    return this.http.post(this.baseUrl + '/trigger-morning', null, {
      params,
      responseType: 'text' as const
    });
  }

  triggerMemoryAnchor(): Observable<string> {
    return this.http.post(this.baseUrl + '/trigger-memory', null, {
      responseType: 'text' as const
    });
  }

  /** After Yes/No on a medication reminder; backend sends the follow-up bot message. */
  submitMedicationResponse(userId: number, tookMedication: boolean): Observable<string> {
    const params = new HttpParams()
      .set('userId', String(userId))
      .set('tookMedication', String(tookMedication));
    return this.http.post(this.baseUrl + '/medication-response', null, {
      params,
      responseType: 'text' as const
    });
  }
}
