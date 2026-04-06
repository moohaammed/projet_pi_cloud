import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class UserService {

  users = signal<any[]>([]);

  constructor(private http: HttpClient) { }

  fetchUsers(): void {
    this.http.get<any[]>('http://localhost:8080/api/users').subscribe({
      next: (data) => this.users.set(data)
    });
  }
}