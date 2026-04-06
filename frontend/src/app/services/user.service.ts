import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl  = 'http://localhost:8080/api/users';
  private authUrl = 'http://localhost:8080/api/auth';

  users = signal<any[]>([]);

  constructor(private http: HttpClient) {}

  /** legacy signal-based fetch */
  fetchUsers(): void {
    this.http.get<any[]>(this.apiUrl).subscribe({ next: d => this.users.set(d) });
  }

  getAll(): Observable<any[]>          { return this.http.get<any[]>(this.apiUrl); }
  getById(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/${id}`); }
  getByRole(role: string): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/role/${role}`); }

  create(user: any): Observable<any>             { return this.http.post<any>(this.apiUrl, user); }
  update(id: number, user: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/${id}`, user); }
  toggleActif(id: number): Observable<any>       { return this.http.patch<any>(`${this.apiUrl}/${id}/toggle`, {}); }
  delete(id: number): Observable<any>            { return this.http.delete(`${this.apiUrl}/${id}`); }

  resetPasswordByEmail(email: string): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/reset-password`, { email });
  }
}