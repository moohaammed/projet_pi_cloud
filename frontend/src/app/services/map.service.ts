import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PatientLocation, SafeZone, GeoAlert } from '../models/map.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MapService {

  private baseUrl = `${environment.geoApiUrl}/api`;
  constructor(private http: HttpClient) {}

  sendLocation(patientId: number, lat: number,
               lng: number, batterie?: number): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/locations/patient/${patientId}`,
      { latitude: lat, longitude: lng, batterie }
    );
  }

  getLastLocation(patientId: number): Observable<PatientLocation> {
    return this.http.get<PatientLocation>(
      `${this.baseUrl}/locations/patient/${patientId}/last`
    );
  }

  getHistory(patientId: number): Observable<PatientLocation[]> {
    return this.http.get<PatientLocation[]>(
      `${this.baseUrl}/locations/patient/${patientId}/history`
    );
  }

  getZoneByPatient(patientId: number): Observable<SafeZone[]> {
    return this.http.get<SafeZone[]>(
      `${this.baseUrl}/safezones/patient/${patientId}`
    );
  }

  createZone(patientId: number, doctorId: number,
             zone: SafeZone): Observable<SafeZone> {
    return this.http.post<SafeZone>(
      `${this.baseUrl}/safezones/patient/${patientId}/doctor/${doctorId}`,
      zone
    );
  }

  updateZone(id: number, zone: SafeZone): Observable<SafeZone> {
    return this.http.put<SafeZone>(
      `${this.baseUrl}/safezones/${id}`, zone
    );
  }

  getAlertsByPatient(patientId: number): Observable<GeoAlert[]> {
    return this.http.get<GeoAlert[]>(
      `${this.baseUrl}/alerts/patient/${patientId}`
    );
  }

  getAllAlerts(): Observable<GeoAlert[]> {
    return this.http.get<GeoAlert[]>(`${this.baseUrl}/alerts`);
  }

  resolveAlert(id: number): Observable<GeoAlert> {
    return this.http.patch<GeoAlert>(
      `${this.baseUrl}/alerts/${id}/resoudre`, {}
    );
  }
  sendSOS(patientId: number, lat: number | undefined, lng: number | undefined): Observable<any> {
  return this.http.post(
    `${this.baseUrl}/alerts/sos/patient/${patientId}`,
    { latitude: lat, longitude: lng }
  );
}
}