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
    console.log('AlzUserService: Fetching all users from', this.apiUrl);
    this.http.get<User[]>(this.apiUrl).subscribe({
      next: (data) => {
        console.log(`AlzUserService: Successfully fetched ${data.length} users.`);
        this.users.set(data);
        if (data.length === 0) {
          console.warn('AlzUserService: Backend returned an empty user list.');
        }
      },
      error: (err) => {
        console.error('AlzUserService: Critical error fetching users from backend:', err);
      }
    });
  }

  updateUserLiveStatus(id: number, isLive: boolean) {
    this.users.update(currentUsers => {
      const copy = [...currentUsers];
      const index = copy.findIndex(u => u.id === id);
      if (index !== -1) {
        copy[index] = { ...copy[index], isLive: isLive };
      }
      return copy;
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
  toggleLive(id: number): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/${id}/toggle-live`, {});
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}