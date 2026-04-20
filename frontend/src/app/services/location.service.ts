import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LocationService {

  constructor(private http: HttpClient) {}

  sendLocation(lat: number, lng: number) {
    return this.http.post(`${environment.apiUrl}/api/location`, {
      latitude: lat,
      longitude: lng
    });
  }
}