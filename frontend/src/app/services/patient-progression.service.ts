import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PatientProgressionService {
  private apiUrl = `${environment.apiUrl}/api/patient-activity`;
  private activitiesUrl = `${environment.apiUrl}/api/activities`;

  constructor(private http: HttpClient) { }

  getScoreAndStade(userId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/score/${userId}`);
  }

  getHistory(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/history/${userId}`);
  }

  submitSession(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/submit`, payload);
  }

  resetPatient(userId: number, type: string = 'ALL'): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/reset/${userId}?type=${type}`, {});
  }
}
