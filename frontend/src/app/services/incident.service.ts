import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Incident {
  id?: string;
  title: string;
  description: string;
  type: string;
  status: string;
  aiAnalysis: string;
  aiConfidence: number;
  reporterId?: number;
  patientId?: number;
  latitude?: number;
  longitude?: number;
  media?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IncidentRequest {
  reporterId: number;
  patientId?: number | null;
  aiAnalysis: string;
  aiConfidence: number;
  latitude?: number;
  longitude?: number;
  media?: string;
}

@Injectable({ providedIn: 'root' })
export class IncidentService {
  private readonly baseUrl = `${environment.apiUrl}/api/incidents`;

  constructor(private http: HttpClient) {}

  /** POST /api/incidents */
  create(payload: IncidentRequest): Observable<Incident> {
    return this.http.post<Incident>(this.baseUrl, payload);
  }

  /** POST /api/incidents/ai */
  createFromAi(req: IncidentRequest): Observable<Incident> {
    return this.http.post<Incident>(`${this.baseUrl}/ai`, req);
  }

  /** GET /api/incidents */
  getAll(): Observable<Incident[]> {
    return this.http.get<Incident[]>(this.baseUrl);
  }

  /** GET /api/incidents/patient/:id */
  getByPatient(patientId: number): Observable<Incident[]> {
    return this.http.get<Incident[]>(`${this.baseUrl}/patient/${patientId}`);
  }

  /** PATCH /api/incidents/:id/resoudre → statut RESOLU */
  resoudre(id: string): Observable<Incident> {
    return this.http.patch<Incident>(`${this.baseUrl}/${id}/resoudre`, {});
  }

  /** PATCH /api/incidents/:id/fermer → statut FERME */
  fermer(id: string): Observable<Incident> {
    return this.http.patch<Incident>(`${this.baseUrl}/${id}/fermer`, {});
  }

  /** PATCH /api/incidents/:id/reouvrir → statut EN_COURS */
  reouvrir(id: string): Observable<Incident> {
    return this.http.patch<Incident>(`${this.baseUrl}/${id}/reouvrir`, {});
  }
}