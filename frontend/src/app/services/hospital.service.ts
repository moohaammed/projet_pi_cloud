import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Hospital } from '../models/hospital.model';

@Injectable({ providedIn: 'root' })
export class HospitalService {
  private apiUrl = 'http://localhost:8089/api/hospitals';
  constructor(private http: HttpClient) {}

  getAll(): Observable<Hospital[]> {
    return this.http.get<Hospital[]>(this.apiUrl);
  }
  getById(id: number): Observable<Hospital> {
    return this.http.get<Hospital>(`${this.apiUrl}/${id}`);
  }
  create(h: Hospital): Observable<Hospital> {
    return this.http.post<Hospital>(this.apiUrl, h);
  }
  update(id: number, h: Hospital): Observable<Hospital> {
    return this.http.put<Hospital>(`${this.apiUrl}/${id}`, h);
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}