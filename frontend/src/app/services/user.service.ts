import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface User {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/users';

  public users = signal<User[]>([]);

  fetchUsers() {
    this.http.get<User[]>(this.baseUrl).subscribe(res => {
      this.users.set(res);
    });
  }
}
