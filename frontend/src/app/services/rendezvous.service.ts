import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RendezVous, StatutRendezVous } from '../models/rendezvous.model';

@Injectable({
  providedIn: 'root'
})
export class RendezVousService {
  private readonly apiUrl = 'http://localhost:8080/api/rendezvous';

  constructor(private http: HttpClient) { }

  getAll(): Observable<RendezVous[]> {
    return this.http.get<RendezVous[]>(this.apiUrl);
  }

  getById(id: string): Observable<RendezVous> {
    return this.http.get<RendezVous>(`${this.apiUrl}/${id}`);
  }

  getByPatient(patientId: number): Observable<RendezVous[]> {
    return this.http.get<RendezVous[]>(`${this.apiUrl}/patient/${patientId}`);
  }

  getByMedecin(medecinId: number): Observable<RendezVous[]> {
    return this.http.get<RendezVous[]>(`${this.apiUrl}/medecin/${medecinId}`);
  }

  create(rv: RendezVous): Observable<RendezVous> {
    return this.http.post<RendezVous>(this.apiUrl, rv);
  }

  update(id: string, rv: RendezVous): Observable<RendezVous> {
    return this.http.put<RendezVous>(`${this.apiUrl}/${id}`, rv);
  }

  updateStatut(id: string, statut: StatutRendezVous): Observable<RendezVous> {
    const params = new HttpParams().set('statut', statut);
    return this.http.patch<RendezVous>(`${this.apiUrl}/${id}/statut`, null, { params });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
