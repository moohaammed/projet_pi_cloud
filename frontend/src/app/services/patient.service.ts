import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
@Injectable({
    providedIn: 'root'
})
export class PatientService {
    private apiUrl = `${environment.apiUrl}/api/patients`;

    constructor(private http: HttpClient) { }

    getAllPatients(): Observable<any[]> {
        console.log(`[PatientService] GET ${this.apiUrl}`);
        return this.http.get<any[]>(this.apiUrl).pipe(
            tap(res => console.log(`[PatientService] Response getAllPatients:`, res)),
            catchError(err => {
                console.error(`[PatientService] Error getAllPatients:`, err);
                return throwError(() => err);
            })
        );
    }

    getPatientById(id: number): Observable<any> {
        console.log(`[PatientService] GET ${this.apiUrl}/${id}`);
        return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
            tap(res => console.log(`[PatientService] Response getPatientById:`, res)),
            catchError(err => {
                console.error(`[PatientService] Error getPatientById:`, err);
                return throwError(() => err);
            })
        );
    }

    getPatientByUserId(userId: number): Observable<any> {
        console.log(`[PatientService] GET ${this.apiUrl}/by-user/${userId}`);
        return this.http.get<any>(`${this.apiUrl}/by-user/${userId}`).pipe(
            tap(res => console.log(`[PatientService] Response getPatientByUserId:`, res)),
            catchError(err => {
                console.error(`[PatientService] Error getPatientByUserId:`, err);
                return throwError(() => err);
            })
        );
    }

    addPatient(patient: any): Observable<any> {
        const springPayload: any = {
            nom: patient.nom,
            prenom: patient.prenom,
            age: patient.age,
            poids: patient.poids,
            sexe: patient.sexe
        };

        // Only attach user if a valid user_id is provided
        if (patient.user_id) {
            springPayload.user = { id: patient.user_id };
        }

        console.log(`[PatientService] POST ${this.apiUrl} Payload:`, springPayload);

        return this.http.post(this.apiUrl, springPayload, { responseType: 'text' }).pipe(
            map(rawResponse => {
                console.log('[PatientService] Raw response addPatient:', rawResponse);
                try {
                    return JSON.parse(rawResponse);
                } catch {
                    // Backend returned plain text (e.g. "BACKEND CREATED") — treat as success with empty object
                    console.warn('[PatientService] Non-JSON response, treating as success:', rawResponse);
                    return { message: rawResponse };
                }
            }),
            catchError(err => {
                console.error(`[PatientService] Error addPatient:`, err);
                return throwError(() => err);
            })
        );
    }

    updatePatient(id: number, patient: any): Observable<any> {
        const springPayload: any = {
            id: id,
            nom: patient.nom,
            prenom: patient.prenom,
            age: patient.age,
            poids: patient.poids,
            sexe: patient.sexe
        };

        if (patient.user_id) {
            springPayload.user = { id: patient.user_id };
        } else if (patient.user && patient.user.id) {
            springPayload.user = { id: patient.user.id };
        }

        console.log(`[PatientService] PUT ${this.apiUrl}/${id} Payload:`, springPayload);
        return this.http.put(`${this.apiUrl}/${id}`, springPayload, { responseType: 'text' }).pipe(
            map(rawResponse => {
                console.log('[PatientService] Raw response updatePatient:', rawResponse);
                try {
                    return JSON.parse(rawResponse);
                } catch {
                    console.warn('[PatientService] Non-JSON response, treating as success:', rawResponse);
                    return { message: rawResponse };
                }
            }),
            catchError(err => {
                console.error(`[PatientService] Error updatePatient:`, err);
                return throwError(() => err);
            })
        );
    }

    deletePatient(id: number): Observable<any> {
        console.log(`[PatientService] DELETE ${this.apiUrl}/${id}`);
        return this.http.delete(`${this.apiUrl}/${id}`, { responseType: 'text' }).pipe(
            map(raw => {
                console.log('[PatientService] Raw response deletePatient:', raw);
                try { return JSON.parse(raw); } catch { return { message: raw }; }
            }),
            catchError(err => {
                console.error(`[PatientService] Error deletePatient:`, err);
                return throwError(() => err);
            })
        );
    }
}
