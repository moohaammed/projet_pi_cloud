import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';

export interface SearchResponseDto {
  id: string;
  type: 'POST' | 'GROUP';
  title: string;
  snippet: string;
  mediaUrl?: string;
  tags?: string[];
  matchScore: number;
}

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = 'http://localhost:8081/api/v1/collab/search';

  search(q?: string, tags?: string[]): Observable<SearchResponseDto[]> {
    let params = new HttpParams();
    if (q) params = params.set('q', q);
    if (tags && tags.length > 0) {
      tags.forEach(t => { params = params.append('tags', t); });
    }

    const userId = this.authService.getCurrentUser()?.id;
    let headers = new HttpHeaders();
    if (userId) {
      headers = headers.set('X-User-Id', userId.toString());
    }

    return this.http.get<SearchResponseDto[]>(this.apiUrl, { params, headers });
  }
}
