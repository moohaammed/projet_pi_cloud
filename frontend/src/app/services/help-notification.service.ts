import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PatientContact } from '../models/patient-contact.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HelpNotificationService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/patient-contacts`;
  private helpUrl = `${environment.apiUrl}/api/help-notifications`;

  /** List all contacts for the given patient user */
  getContacts(userId: number): Observable<PatientContact[]> {
    return this.http.get<PatientContact[]>(`${this.baseUrl}?userId=${userId}`);
  }

  /** Create a new contact */
  createContact(userId: number, contact: PatientContact): Observable<PatientContact> {
    return this.http.post<PatientContact>(`${this.baseUrl}?userId=${userId}`, contact);
  }

  /** Update an existing contact */
  updateContact(userId: number, contactId: number, contact: PatientContact): Observable<PatientContact> {
    return this.http.put<PatientContact>(`${this.baseUrl}/${contactId}?userId=${userId}`, contact);
  }

  /** Delete a contact */
  deleteContact(userId: number, contactId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${contactId}?userId=${userId}`);
  }

  /** Trigger help notification sending */
  sendHelpNotification(userId: number): Observable<any> {
    return this.http.post(`${this.helpUrl}/send?userId=${userId}`, {});
  }
}
