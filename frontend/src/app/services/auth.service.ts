import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = 'http://localhost:8080/api/auth';
  private isBrowser: boolean;
  private loggedIn$: BehaviorSubject<boolean>;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.loggedIn$ = new BehaviorSubject<boolean>(this.isLoggedIn());
  }

  login(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, data).pipe(
      tap(res => {
        if (this.isBrowser) {
          localStorage.setItem('user', JSON.stringify(res));
        }
        this.loggedIn$.next(true);
      })
    );
  }

  register(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, data).pipe(
      tap(res => {
        if (this.isBrowser) {
          localStorage.setItem('user', JSON.stringify(res));
        }
        this.loggedIn$.next(true);
      })
    );
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.clear();
    }
    this.loggedIn$.next(false);
    this.router.navigate(['/auth/login']);
  }

  isLoggedIn(): boolean {
    if (!this.isBrowser) return false;
    return !!localStorage.getItem('user');
  }

  getLoggedIn$(): Observable<boolean> {
    return this.loggedIn$.asObservable();
  }

  getRole(): string {
    if (!this.isBrowser) return '';
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role || '';
  }

  getCurrentUser(): any {
    if (!this.isBrowser) return {};
    return JSON.parse(localStorage.getItem('user') || '{}');
  }

  redirectByRole(): void {
    const role = this.getRole();
    switch (role) {
      case 'ADMIN':    this.router.navigate(['/users']); break;
      case 'DOCTOR':   this.router.navigate(['/hospitals']); break;
      case 'PATIENT':  this.router.navigate(['/hospitals']); break;
      case 'RELATION': this.router.navigate(['/hospitals']); break;
      default:         this.router.navigate(['/auth/login']);
    }
  }
}