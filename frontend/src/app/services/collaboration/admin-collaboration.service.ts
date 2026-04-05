import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';

export interface SystemHealthKpis {
  unresolvedSafetyAlerts: number;
  pendingModeration: number;
}

export interface SafetyAlertLogRow {
  id: number;
  patientName: string;
  alertType: string;
  time: string;
  status: string;
}

export interface ModerationQueueItem {
  publicationId: number;
  authorName: string;
  authorId: number;
  contentPreview: string;
  reason: string;
  flaggedAt: string;
  type: string;
}

export interface PlatformStressTrend {
  labels: string[];
  totalActivitySeries: number[];
  negativeSentimentSeries: number[];
  criticalAlertSeries: number[];
}

export interface DirectMessageMetadata {
  userIdA: number;
  userIdB: number;
  messageCount: number;
  lastActivity: string | null;
  distressedMessageCount: number;
}

export interface ChatGroupAdmin {
  id: number;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  createdAt: string;
  ownerName?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminCollaborationService {
  private readonly base = 'http://localhost:8080/api/admin/collaboration';
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private headers(): HttpHeaders {
    const u = this.auth.getCurrentUser();
    const id = u?.id;
    if (id == null) {
      return new HttpHeaders();
    }
    return new HttpHeaders().set('X-Admin-User-Id', String(id));
  }

  getKpis(): Observable<SystemHealthKpis> {
    return this.http.get<SystemHealthKpis>(`${this.base}/health/kpis`, { headers: this.headers() });
  }

  getSafetyLogs(): Observable<SafetyAlertLogRow[]> {
    return this.http.get<SafetyAlertLogRow[]>(`${this.base}/safety-logs`, { headers: this.headers() });
  }

  getModerationQueue(): Observable<ModerationQueueItem[]> {
    return this.http.get<ModerationQueueItem[]>(`${this.base}/moderation/queue`, { headers: this.headers() });
  }

  dismissFlag(publicationId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/moderation/${publicationId}/dismiss`, {}, { headers: this.headers() });
  }

  deletePost(publicationId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/moderation/${publicationId}`, { headers: this.headers() });
  }

  suspendUser(userId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/users/${userId}/suspend`, {}, { headers: this.headers() });
  }

  getStressTrend(days = 7): Observable<PlatformStressTrend> {
    return this.http.get<PlatformStressTrend>(`${this.base}/analytics/stress-trend`, {
      headers: this.headers(),
      params: { days: String(days) }
    });
  }

  getDirectMessageMetadata(): Observable<DirectMessageMetadata[]> {
    return this.http.get<DirectMessageMetadata[]>(`${this.base}/privacy/direct-messages/metadata`, {
      headers: this.headers()
    });
  }

  retroactiveScan(): Observable<void> {
    return this.http.post<void>(`${this.base}/analytics/retroactive-scan`, {}, {
      headers: this.headers()
    });
  }

  getAllGroups(): Observable<ChatGroupAdmin[]> {
    return this.http.get<ChatGroupAdmin[]>(`${this.base}/groups`, { headers: this.headers() });
  }

  deleteGroup(groupId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/groups/${groupId}`, { headers: this.headers() });
  }

  updateGroup(groupId: number, dto: ChatGroupAdmin): Observable<void> {
    return this.http.put<void>(`${this.base}/groups/${groupId}`, dto, { headers: this.headers() });
  }

  postAnnouncement(content: string): Observable<void> {
    return this.http.post<void>(`${this.base}/announcement`, { content }, { headers: this.headers() });
  }

  getUserGroups(userId: number): Observable<ChatGroupAdmin[]> {
    return this.http.get<ChatGroupAdmin[]>(`${this.base}/users/${userId}/groups`, { headers: this.headers() });
  }

  approvePost(publicationId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/moderation/${publicationId}/approve`, {}, { headers: this.headers() });
  }

  banUser(userId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/moderation/users/${userId}/ban`, {}, { headers: this.headers() });
  }
}
