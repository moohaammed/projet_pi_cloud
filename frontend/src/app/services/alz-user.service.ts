import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, Role } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AlzUserService {

  private apiUrl = 'http://localhost:8080/api/users';
  users = signal<User[]>([]);

  constructor(private http: HttpClient) {}

  fetchUsers(): void {
    this.http.get<User[]>(this.apiUrl).subscribe({
      next: (data) => this.users.set(data),
      error: (err) => console.error('Error fetching users:', err)
    });
  }

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }
  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }
  getByRole(role: Role): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/role/${role}`);
  }
  create(user: User): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }
  update(id: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user);
  }
  toggleActif(id: number): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}/toggle`, {});
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}