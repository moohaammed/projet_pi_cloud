import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Patient } from '../models/patient.model';

@Injectable({
  providedIn: 'root'
})
export class PatientService {

  private apiUrl = 'http://localhost:8080/api/patients';

  constructor(private http: HttpClient) {}

  getAllPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(this.apiUrl);
  }

  getPatientById(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/${id}`);
  }

  // ✅ addPatient / createPatient — unifié sous addPatient
  addPatient(patient: any): Observable<Patient> {
    return this.http.post<Patient>(this.apiUrl, patient);
  }

  // alias pour compatibilité avec patient-form.component.ts qui appelle createPatient()
  createPatient(patient: any): Observable<Patient> {
    return this.addPatient(patient);
  }

  updatePatient(id: number, patient: any): Observable<Patient> {
    return this.http.put<Patient>(`${this.apiUrl}/${id}`, patient);
  }

  deletePatient(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}