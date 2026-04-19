import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RappelService {
  private apiUrl = 'http://localhost:8080/api/rappel-quotidien';

  constructor(private http: HttpClient) {}

  getByPatient(patientId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/patient/${patientId}`);
  }

  create(rappel: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, rappel);
  }

  update(id: number, rappel: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, rappel);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggle(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/toggle`, {});
  }
}
