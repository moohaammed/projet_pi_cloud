import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type LocationStatus = 'ZONE_CONNUE' | 'ZONE_INCONNUE';

export interface LocationPredictionRequest {
  image: string;
  patientId: number;
  reporterId?: number;
}

export interface LocationPrediction {
  lieu: string;
  confiance: string;
  statut: LocationStatus;
  patientId?: number;
  date?: string;
  incidentId?: string;
}

export interface LocationHistoryItem extends LocationPrediction {
  id: string;
  confidenceScore?: number;
  photo?: string;
}

@Injectable({ providedIn: 'root' })
export class LocationRecognitionService {
  private readonly baseUrl = `${environment.apiUrl}/api/location`;

  constructor(private http: HttpClient) {}

  predict(payload: LocationPredictionRequest): Observable<LocationPrediction> {
    return this.http.post<LocationPrediction>(`${this.baseUrl}/predict`, payload);
  }

  current(patientId: number): Observable<LocationHistoryItem> {
    return this.http.get<LocationHistoryItem>(`${this.baseUrl}/current/${patientId}`);
  }

  history(patientId: number): Observable<LocationHistoryItem[]> {
    return this.http.get<LocationHistoryItem[]>(`${this.baseUrl}/history/${patientId}`);
  }
}
