import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RappelService {
  private apiUrl = `${environment.apiUrl}/api/rappel-quotidien`;

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

  uploadVoice(id: number, audioBlob: Blob): Observable<any> {
    const formData = new FormData();
    formData.append('audio', audioBlob, `rappel_${id}.webm`);
    return this.http.post(`${this.apiUrl}/${id}/voice`, formData);
  }

  getVoiceUrl(id: number): string {
    return `${this.apiUrl}/${id}/voice`;
  }

  summarizeVoice(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/summarize`, {});
  }

  testGroq(): Observable<any> {
    return this.http.get(`${this.apiUrl}/test-groq`);
  }
}
