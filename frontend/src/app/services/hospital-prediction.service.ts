import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RecommendedHospital {
  nom: string;
  gouvernorat: string;
  distanceKm?: string;
  distance_km?: string;
  specialite: string;
  telephone: string;
  adresse: string;
  latitude: number;
  longitude: number;
  recommande: boolean;
}

export interface HospitalPrediction {
  id?: string;
  patientId?: number;
  patientName?: string;
  incidentId?: string;
  alertId?: string;
  typeIncident?: string;
  patientLatitude: number;
  patientLongitude: number;
  hopitaux: RecommendedHospital[];
  createdAt?: string;
}

export interface HospitalPredictionRequest {
  patientLatitude: number;
  patientLongitude: number;
  typeIncident: string;
  patientId?: number;
  incidentId?: string;
  alertId?: string;
  patientName?: string;
}

@Injectable({ providedIn: 'root' })
export class HospitalPredictionService {
  private readonly baseUrl = `${environment.geoApiUrl}/api/hospital`;

  constructor(private http: HttpClient) {}

  predict(payload: HospitalPredictionRequest): Observable<HospitalPrediction> {
    return this.http.post<HospitalPrediction>(`${this.baseUrl}/predict`, payload);
  }

  latest(): Observable<HospitalPrediction[]> {
    return this.http.get<HospitalPrediction[]>(`${this.baseUrl}/prediction/latest`);
  }

  latestForPatient(patientId: number): Observable<HospitalPrediction> {
    return this.http.get<HospitalPrediction>(`${this.baseUrl}/prediction/latest/${patientId}`);
  }

  searchDataset(query: string, patientLatitude?: number, patientLongitude?: number, limit?: number): Observable<RecommendedHospital[]> {
    const params: any = { query };
    if (patientLatitude !== undefined && patientLongitude !== undefined) {
      params.patientLatitude = patientLatitude;
      params.patientLongitude = patientLongitude;
    }
    if (limit !== undefined) {
      params.limit = limit;
    }
    return this.http.get<RecommendedHospital[]>(`${this.baseUrl}/search`, { params });
  }
}
