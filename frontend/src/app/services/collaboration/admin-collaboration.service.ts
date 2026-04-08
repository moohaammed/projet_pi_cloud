import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';
import { PublicationDto } from './publication.service';

export interface SystemHealthKpis {
  unresolvedSafetyAlerts: number;
  pendingModeration: number;
}

export interface SafetyAlertLogRow {
  id: string;
  patientName: string;
  alertType: string;
  time: string;
  status: string;
}

export interface ModerationQueueItem {
  publicationId: string;
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
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  createdAt: string;
  ownerName?: string;
}

export interface EngagementMix {
  publications: number;
  comments: number;
  messages: number;
  shares: number;
}

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
}

export interface AiImpact {
  totalMessages: number;
  summariesGenerated: number;
  summariesViewed: number;
}

export interface ClinicalPulse {
  topThemes: string[];
  aiSummary: string;
  sentimentVelocity: string;
  totalAnalyzed: number;
}

@Injectable({ providedIn: 'root' })
export class AdminCollaborationService {
  private readonly base = 'http://localhost:8080/api/admin/collaboration';
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private headers(): HttpHeaders {
    const u = this.auth.getCurrentUser();
    const id = u?.id;
    if (id == null) return new HttpHeaders();
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

  dismissFlag(publicationId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/moderation/${publicationId}/dismiss`, {}, { headers: this.headers() });
  }

  deletePost(publicationId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/moderation/${publicationId}`, { headers: this.headers() });
  }

  suspendUser(userId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/users/${userId}/suspend`, {}, { headers: this.headers() });
  }

  getStressTrend(days = 7): Observable<PlatformStressTrend> {
    return this.http.get<PlatformStressTrend>(`${this.base}/analytics/stress-trend`, {
      headers: this.headers(), params: { days: String(days) }
    });
  }

  getDirectMessageMetadata(): Observable<DirectMessageMetadata[]> {
    return this.http.get<DirectMessageMetadata[]>(`${this.base}/privacy/direct-messages/metadata`, { headers: this.headers() });
  }

  retroactiveScan(): Observable<void> {
    return this.http.post<void>(`${this.base}/analytics/retroactive-scan`, {}, { headers: this.headers() });
  }

  getAllGroups(): Observable<ChatGroupAdmin[]> {
    return this.http.get<ChatGroupAdmin[]>(`${this.base}/groups`, { headers: this.headers() });
  }

  deleteGroup(groupId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/groups/${groupId}`, { headers: this.headers() });
  }

  updateGroup(groupId: string, dto: ChatGroupAdmin): Observable<void> {
    return this.http.put<void>(`${this.base}/groups/${groupId}`, dto, { headers: this.headers() });
  }

  postAnnouncement(content: string, groupId?: string, scheduledAt?: string): Observable<void> {
    return this.http.post<void>(`${this.base}/announcement`, { content, groupId, scheduledAt }, { headers: this.headers() });
  }

  getScheduledAnnouncements(): Observable<PublicationDto[]> {
    return this.http.get<PublicationDto[]>(`${this.base}/announcements/scheduled`, { headers: this.headers() });
  }

  getUserGroups(userId: number): Observable<ChatGroupAdmin[]> {
    return this.http.get<ChatGroupAdmin[]>(`${this.base}/users/${userId}/groups`, { headers: this.headers() });
  }

  approvePost(publicationId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/moderation/${publicationId}/approve`, {}, { headers: this.headers() });
  }

  banUser(userId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/moderation/users/${userId}/ban`, {}, { headers: this.headers() });
  }

  getEngagementMix(): Observable<EngagementMix> {
    return this.http.get<EngagementMix>(`${this.base}/analytics/engagement-mix`, { headers: this.headers() });
  }

  getSentimentDistribution(): Observable<SentimentDistribution> {
    return this.http.get<SentimentDistribution>(`${this.base}/analytics/sentiment-distribution`, { headers: this.headers() });
  }

  getAiImpact(): Observable<AiImpact> {
    return this.http.get<AiImpact>(`${this.base}/analytics/ai-impact`, { headers: this.headers() });
  }

  getPulse(): Observable<ClinicalPulse> {
    return this.http.get<ClinicalPulse>(`${this.base}/analytics/clinical-pulse`, { headers: this.headers() });
  }

  getRetrospective(groupId: string, hours: number): Observable<any> {
    return this.http.get<any>(`${this.base}/analytics/retrospective`, {
      headers: this.headers(),
      params: { groupId, hours: String(hours) }
    });
  }
}
