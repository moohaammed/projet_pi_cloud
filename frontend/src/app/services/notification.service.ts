import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8080/api/patient-notification';

  constructor(private http: HttpClient) {}

  getLatest(patientId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${patientId}`);
  }

  markAsRead(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/read/${id}`, {});
  }

  markAllAsRead(patientId: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/read-all/${patientId}`, {});
  }

  getUnreadCount(patientId: number): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count/${patientId}`);
  }
}
