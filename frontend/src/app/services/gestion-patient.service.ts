import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GestionPatientService {
  private apiUrlPatients = 'http://localhost:8080/api/patients';
  private apiUrlAnalyses = 'http://localhost:8080/api/analyses';
  private apiUrlHistorique = 'http://localhost:8080/api/historique/patient';

  constructor(private http: HttpClient) { }

  // Patients
  getAllPatients(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrlPatients);
  }

  getPatientById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrlPatients}/${id}`);
  }

  createPatient(patient: any): Observable<any> {
    return this.http.post<any>(this.apiUrlPatients, patient);
  }

  updatePatient(id: number, patient: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrlPatients}/${id}`, patient);
  }

  // Analyses
  getAnalysesByPatient(patientId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrlAnalyses}/patient/${patientId}`);
  }

  getHistoriqueByPatient(patientId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrlHistorique}/${patientId}`);
  }

  createAnalyse(analyse: any): Observable<any> {
    return this.http.post<any>(this.apiUrlAnalyses, analyse);
  }

  updateAnalyse(id: number, analyse: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrlAnalyses}/${id}`, analyse);
  }
}
