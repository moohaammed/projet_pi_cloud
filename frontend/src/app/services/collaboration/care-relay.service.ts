import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HandoverDTO {
  summary: string;
  criticalAlerts: string[];
  pendingTasks: string[];
  averageSentiment: number;
  totalMessages: number;
  totalPublications: number;
  pollCount: number;
}

@Injectable({ providedIn: 'root' })
export class CareRelayService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/care-relay';

  handover = signal<HandoverDTO | null>(null);
  loading = signal(false);

  fetchHandover(groupId: string, hours: number = 8): Observable<HandoverDTO> {
    return this.http.get<HandoverDTO>(`${this.apiUrl}/handover?groupId=${groupId}&hours=${hours}`);
  }

  loadHandover(groupId: string, hours: number = 8) {
    this.loading.set(true);
    this.fetchHandover(groupId, hours).subscribe({
      next: (dto) => {
        this.handover.set(dto);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  clearHandover() {
    this.handover.set(null);
  }
}
