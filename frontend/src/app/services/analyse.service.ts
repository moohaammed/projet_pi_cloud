import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class AnalyseService {
    private apiUrl = 'http://localhost:8080/api/analyses';
    private apiHistoriqueUrl = 'http://localhost:8080/api/historique/patient';

    constructor(private http: HttpClient) { }

    getAllAnalyses(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl);
    }

    getAnalysesByPatient(patientId: number): Observable<any[]> {
        console.log(`[AnalyseService] GET ${this.apiUrl}/patient/${patientId}`);
        return this.http.get<any[]>(`${this.apiUrl}/patient/${patientId}`).pipe(
            tap(res => console.log(`[AnalyseService] Response getAnalysesByPatient:`, res)),
            catchError(err => {
                console.error(`[AnalyseService] Error getAnalysesByPatient:`, err);
                return throwError(() => err);
            })
        );
    }

    predictAlzheimer(imageBase64: string): Observable<{prediction: string, confidence: number}> {
        return this.http.post<{prediction: string, confidence: number}>('http://localhost:5000/predict', { image: imageBase64 }).pipe(
            tap(res => console.log(`[AnalyseService] Response predictAlzheimer:`, res)),
            catchError(err => {
                console.error(`[AnalyseService] Error in predictAlzheimer:`, err);
                return throwError(() => err);
            })
        );
    }

    addAnalyse(analyse: any): Observable<any> {
        const payload = {
            patient_id: analyse.patient_id,
            date: analyse.date,
            statut: analyse.statut || "EN_COURS",
            rapport_medical: analyse.rapport_medical,
            image_irm: analyse.image_irm,
            score_jeu: analyse.score_jeu,
            pourcentage_risque: analyse.pourcentage_risque,
            interpretation: analyse.interpretation,
            observation_medicale: analyse.observation_medicale
        };

        const springPayload = {
            patient: { id: payload.patient_id },
            date: payload.date,
            statut: payload.statut,
            rapportMedical: payload.rapport_medical,
            imageIRM: payload.image_irm,
            scoreJeu: payload.score_jeu,
            pourcentageRisque: payload.pourcentage_risque,
            interpretation: payload.interpretation,
            observationMedicale: payload.observation_medicale
        };

        console.log(`[AnalyseService] POST ${this.apiUrl} Payload:`, payload);
        console.log(`[AnalyseService] Spring Payload sent:`, springPayload);
        return this.http.post(this.apiUrl, springPayload, { responseType: 'text' }).pipe(
            map((rawResponse: string) => {
                console.log('[AnalyseService] Raw response addAnalyse:', rawResponse);
                try {
                    return JSON.parse(rawResponse);
                } catch {
                    console.warn('[AnalyseService] Non-JSON response, treating as success:', rawResponse);
                    return { message: rawResponse };
                }
            }),
            catchError(err => {
                console.error(`[AnalyseService] Error addAnalyse:`, err);
                return throwError(() => err);
            })
        );
    }

    updateAnalyse(id: number, updatedAnalyse: any): Observable<any> {
        const springPayload = {
            id: id,
            ...updatedAnalyse
        };

        console.log(`[AnalyseService] PUT ${this.apiUrl}/${id} Payload:`, updatedAnalyse);
        return this.http.put<any>(`${this.apiUrl}/${id}`, springPayload).pipe(
            tap(res => console.log(`[AnalyseService] Response updateAnalyse:`, res)),
            catchError(err => {
                console.error(`[AnalyseService] Error updateAnalyse:`, err);
                return throwError(() => err);
            })
        );
    }

    analyzeReport(reportText: string, mriResult: string, cognitiveScore: string | null): Observable<any> {
        const payload = {
            report_text: reportText,
            mri_result: mriResult,
            cognitive_score: cognitiveScore || 'N/A'
        };
        return this.http.post<any>('http://localhost:5000/analyze-report', payload).pipe(
            tap(res => console.log(`[AnalyseService] Response analyzeReport:`, res)),
            catchError(err => {
                console.error(`[AnalyseService] Error in analyzeReport:`, err);
                return throwError(() => err);
            })
        );
    }

    chatWithReport(question: string, reportText: string): Observable<string> {
        const payload = {
            question: question,
            report_text: reportText
        };
        return this.http.post('http://localhost:5000/chat', payload, { responseType: 'text' }).pipe(
            tap(res => console.log(`[AnalyseService] Response chatWithReport:`, res)),
            catchError(err => {
                console.error(`[AnalyseService] Error in chatWithReport:`, err);
                return throwError(() => err);
            })
        );
    }
}
