import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MonitoredPatient {
  patientId: number;
  userId: number | null;
  nom: string | null;
  prenom: string | null;
  age?: number | null;
  poids?: number | null;
  sexe?: string | null;
}

@Injectable({ providedIn: 'root' })
export class HeartRateAccessService {
  private apiUrl = `${environment.apiUrl}/api/heart-rate-access`;

  constructor(private http: HttpClient) {}

  getDoctorPatients(doctorUserId: number): Observable<MonitoredPatient[]> {
    return this.http.get<MonitoredPatient[]>(`${this.apiUrl}/doctor/${doctorUserId}/patients`);
  }

  getAdminPatients(adminUserId: number): Observable<MonitoredPatient[]> {
    return this.http.get<MonitoredPatient[]>(`${this.apiUrl}/admin/${adminUserId}/patients`);
  }

  getRelationLinkedPatient(relationUserId: number): Observable<MonitoredPatient | null> {
    return this.http.get<MonitoredPatient | null>(`${this.apiUrl}/relation/${relationUserId}/patient`);
  }

  getRelationPatients(relationUserId: number): Observable<MonitoredPatient[]> {
    return this.http.get<MonitoredPatient[]>(`${this.apiUrl}/relation/${relationUserId}/patients`);
  }
}
