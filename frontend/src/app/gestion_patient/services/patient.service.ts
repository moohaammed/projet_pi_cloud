import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Patient, Analyse } from '../models/patient.model';

@Injectable({
  providedIn: 'root'
})
export class PatientService {

  private apiUrl = 'http://localhost:8082/api/patients';
  private analyseUrl = 'http://localhost:8082/api/analyses';

  constructor(private http: HttpClient) {}

  /** Récupère tous les patients */
  getAllPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(this.apiUrl);
  }

  /** Alias pour compatibilité */
  getPatients(): Observable<Patient[]> {
    return this.getAllPatients();
  }

  getPatientById(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/${id}`);
  }

  getPatientByUserId(userId: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/by-user/${userId}`);
  }

  createPatient(patient: any): Observable<Patient> {
    return this.http.post<Patient>(this.apiUrl, patient);
  }

  updatePatient(id: number, patient: any): Observable<Patient> {
    return this.http.put<Patient>(`${this.apiUrl}/${id}`, patient);
  }

  deletePatient(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /** Récupère les analyses d'un patient */
  getAnalysesByPatient(patientId: number): Observable<Analyse[]> {
    return this.http.get<Analyse[]>(`${this.analyseUrl}/patient/${patientId}`);
  }
}