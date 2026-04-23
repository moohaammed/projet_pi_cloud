import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Angular service for manually triggering CareBot actions from the frontend.
 *
 * All requests go to /api/carebot/test on the API Gateway (port 8080).
 *
 * These methods are used by the messenger component's CareBot chat tab:
 *   - triggerMedicationReminder() — sends the medication reminder to the current user
 *   - submitMedicationResponse()  — records the patient's YES/NO answer
 *   - triggerMemoryAnchor()       — sends the memory notification to all patients
 *
 * The backend validates that the target user has role PATIENT before sending.
 * If not, it returns 400 Bad Request.
 */
@Injectable({ providedIn: 'root' })
export class CareBotService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/carebot/test';

  /**
   * Triggers the medication reminder.
   *   - With userId: sends only to that patient (must have PATIENT role)
   *   - Without userId: sends to ALL patients (same as the scheduled job)
   *
   * Returns the backend's plain-text response message.
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

  /**
   * Triggers the memory anchor notification for all patients.
   * Sends a notification reminding patients to check the feed for a memory post.
   */
  triggerMemoryAnchor(): Observable<string> {
    return this.http.post(this.baseUrl + '/trigger-memory', null, {
      responseType: 'text' as const
    });
  }

  /**
   * Records the patient's response to the medication reminder.
   * The backend sends a follow-up bot message and logs the compliance record.
   *
   * @param tookMedication true = patient confirmed they took it, false = they haven't yet
   */
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
