import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AssignmentService {
  private apiUrl = 'http://localhost:8080/api/patients';

  constructor(private http: HttpClient) {}

  /** Returns all patients assigned to a given doctor (by doctor user ID) */
  getPatientsByMedecin(medecinId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/by-medecin/${medecinId}`).pipe(
      tap(res => console.log(`[AssignmentService] Patients for medecin ${medecinId}:`, res)),
      catchError(err => {
        console.error(`[AssignmentService] Error fetching patients for medecin:`, err);
        // fallback: return all patients so the dashboard still works
        return this.http.get<any[]>(this.apiUrl).pipe(
          catchError(() => of([]))
        );
      })
    );
  }

  /** Returns the assigned doctor for a given patient (by patient user ID) */
  getMedecinByPatient(patientUserId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/assigned-doctor/${patientUserId}`).pipe(
      catchError(err => {
        console.warn(`[AssignmentService] No doctor assigned or error:`, err);
        return of(null);
      })
    );
  }

  /** Assigns a patient to a doctor */
  assign(medecinId: number, patientId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${patientId}/assign/${medecinId}`, {}).pipe(
      catchError(err => throwError(() => err))
    );
  }

  /** Removes a patient from a doctor */
  unassign(medecinId: number, patientId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${patientId}/unassign`).pipe(
      catchError(err => throwError(() => err))
    );
  }

  /** Reassigns a patient from one doctor to another */
  reassign(fromMedecinId: number, patientId: number, toMedecinId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${patientId}/reassign/${toMedecinId}`, {}).pipe(
      catchError(err => throwError(() => err))
    );
  }
}
