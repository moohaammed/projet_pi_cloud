import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, map, of, delay } from 'rxjs';
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
    let initialLoginStatus = false;
    try {
      initialLoginStatus = this.isLoggedIn();
    } catch (e) {
      console.error('Error during initial login check:', e);
      if (this.isBrowser) localStorage.removeItem('user');
    }
    this.loggedIn$ = new BehaviorSubject<boolean>(initialLoginStatus);
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data, { responseType: 'text' }).pipe(
      tap(res => {
        let user;
        try {
          user = JSON.parse(res);
        } catch (e) {
          user = res; // C'est peut-être juste un message
        }
        if (this.isBrowser && typeof user === 'object') {
          localStorage.setItem('user', JSON.stringify(user));
        }
        this.loggedIn$.next(true);
      })
    );
  }

  register(data: any): Observable<any> {
    // If it's FormData, let the browser handle the content type and boundary
    if (data instanceof FormData) {
      return this.http.post(`${this.apiUrl}/register`, data, { responseType: 'text' }).pipe(
        tap(res => {
          let user;
          try {
            user = JSON.parse(res);
          } catch (e) {
            user = res;
          }
          if (this.isBrowser && typeof user === 'object') {
            localStorage.setItem('user', JSON.stringify(user));
          }
          this.loggedIn$.next(true);
        })
      );
    }

    // Fallback for JSON registration if needed
    return this.http.post(`${this.apiUrl}/register`, data, { responseType: 'text' }).pipe(
      tap(res => {
        let user;
        try {
          user = JSON.parse(res);
        } catch (e) {
          user = res;
        }
        if (this.isBrowser && typeof user === 'object') {
          localStorage.setItem('user', JSON.stringify(user));
        }
        this.loggedIn$.next(true);
      })
    );
  }

  // ==== MOCK GOOGLE LOGIN ====
  loginWithGoogle(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/google`, { token }).pipe(
      tap((user: any) => {
        if (this.isBrowser && typeof user === 'object') {
          localStorage.setItem('user', JSON.stringify(user));
        }
        this.loggedIn$.next(true);
      })
    );
  }

  // ==== MOT DE PASSE OUBLIÉ ====
  resetPassword(email: string): Observable<any> {
    // Appel normal vers le backend
    // Assurez-vous que l'endpoint "forgot-password" ou "reset-password" existe et envoie l'email.
    return this.http.post(`${this.apiUrl}/reset-password`, { email });
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
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.role || '';
    } catch (e) {
      console.error('AuthService: error parsing user role', e);
      return '';
    }
  }

  getCurrentUser(): any {
    if (!this.isBrowser) return {};
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
      console.error('AuthService: error parsing current user', e);
      return {};
    }
  }

  redirectByRole(): void {
    const role = this.getRole();
    switch (role) {
      case 'ADMIN':    this.router.navigate(['/admin/dashboard']); break;
      case 'DOCTOR':   this.router.navigate(['/medecin-dashboard']); break;
      case 'PATIENT':  this.router.navigate(['/home']); break;
      case 'RELATION': this.router.navigate(['/patient-dashboard']); break;
      default:         this.router.navigate(['/auth/login']);
    }
  }
}