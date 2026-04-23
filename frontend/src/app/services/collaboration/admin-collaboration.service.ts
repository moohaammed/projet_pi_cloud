import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';
import { PublicationDto } from './publication.service';

/** A content item (post or group message) for admin content browser */
export interface ContentItem {
  id: string;
  type: 'POST' | 'MESSAGE';
  content: string;
  authorName: string;
  authorId: number;
  groupName?: string;
  groupId?: string;
  createdAt: string;
  distressed: boolean;
  moderationStatus?: string;
}

/** Dashboard KPIs — counts of items needing immediate attention */
export interface SystemHealthKpis {
  unresolvedSafetyAlerts: number;
  pendingModeration: number;
}

/** A single row in the safety alert log table */
export interface SafetyAlertLogRow {
  id: string;
  patientName: string;
  alertType: string;
  time: string;
  status: string;
}

/** A post flagged for admin review */
export interface ModerationQueueItem {
  publicationId: string;
  authorName: string;
  authorId: number;
  contentPreview: string;
  reason: string;
  flaggedAt: string;
  type: string;
}

/** Daily time-series data for the stress trend chart */
export interface PlatformStressTrend {
  labels: string[];
  totalActivitySeries: number[];
  negativeSentimentSeries: number[];
  criticalAlertSeries: number[];
}

/** Metadata about a DM thread (no message content — privacy-safe) */
export interface DirectMessageMetadata {
  userIdA: number;
  userIdB: number;
  messageCount: number;
  lastActivity: string | null;
  distressedMessageCount: number;
}

/** A group as seen by the admin (includes member count and owner name) */
export interface ChatGroupAdmin {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  createdAt: string;
  ownerName?: string;
  isDefault?: boolean;
  defaultForRole?: string;
}

/** Counts of different content types for the engagement mix chart */
export interface EngagementMix {
  publications: number;
  comments: number;
  messages: number;
  shares: number;
}

/** Breakdown of sentiment scores across all content */
export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
}

/** AI usage statistics */
export interface AiImpact {
  totalMessages: number;
  summariesGenerated: number;
  summariesViewed: number;
}

/** AI-generated thematic analysis of recent platform activity */
export interface ClinicalPulse {
  topThemes: string[];
  aiSummary: string;
  sentimentVelocity: string;
  totalAnalyzed: number;
}

/**
 * Angular service for all admin collaboration dashboard HTTP operations.
 *
 * All requests go through the API Gateway (port 8080) to /api/admin/collaboration.
 *
 * Authentication:
 *   Every request includes the X-Admin-User-Id header with the current user's ID.
 *   The backend validates that this ID belongs to an active ADMIN user.
 *   The headers() helper method builds this header from the AuthService.
 *
 * Used by the admin dashboard component to populate:
 *   - KPI cards (alerts, moderation queue)
 *   - Safety alert log table
 *   - Moderation queue with approve/delete actions
 *   - Analytics charts (stress trend, engagement mix, sentiment distribution)
 *   - Group management table
 *   - Clinical pulse AI summary
 */
@Injectable({ providedIn: 'root' })
export class AdminCollaborationService {
  private readonly base = 'http://localhost:8080/api/admin/collaboration';
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  /**
   * Builds the X-Admin-User-Id header from the currently logged-in user.
   * Returns an empty HttpHeaders if no user is logged in (requests will fail with 403).
   */
  private headers(): HttpHeaders {
    const u = this.auth.getCurrentUser();
    const id = u?.id;
    if (id == null) return new HttpHeaders();
    return new HttpHeaders().set('X-Admin-User-Id', String(id));
  }

  /** Returns unresolved safety alert count and pending moderation count */
  getKpis(): Observable<SystemHealthKpis> {
    return this.http.get<SystemHealthKpis>(`${this.base}/health/kpis`, { headers: this.headers() });
  }

  /** Returns the 200 most recent safety alert log entries */
  getSafetyLogs(): Observable<SafetyAlertLogRow[]> {
    return this.http.get<SafetyAlertLogRow[]>(`${this.base}/safety-logs`, { headers: this.headers() });
  }

  /** Returns all posts currently flagged for moderation review */
  getModerationQueue(): Observable<ModerationQueueItem[]> {
    return this.http.get<ModerationQueueItem[]>(`${this.base}/moderation/queue`, { headers: this.headers() });
  }

  /** Clears the moderation flag on a post (post stays visible) */
  dismissFlag(publicationId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/moderation/${publicationId}/dismiss`, {}, { headers: this.headers() });
  }

  /** Permanently deletes a flagged post */
  deletePost(publicationId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/moderation/${publicationId}`, { headers: this.headers() });
  }

  /** Suspends a user account */
  suspendUser(userId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/users/${userId}/suspend`, {}, { headers: this.headers() });
  }

  /** Returns daily activity + distress trend data for the last N days */
  getStressTrend(days = 7): Observable<PlatformStressTrend> {
    return this.http.get<PlatformStressTrend>(`${this.base}/analytics/stress-trend`, {
      headers: this.headers(), params: { days: String(days) }
    });
  }

  /** Returns DM metadata (counts and timestamps, no message content) */
  getDirectMessageMetadata(): Observable<DirectMessageMetadata[]> {
    return this.http.get<DirectMessageMetadata[]>(`${this.base}/privacy/direct-messages/metadata`, { headers: this.headers() });
  }

  /** Triggers a retroactive scan of the last 30 days of messages for missed safety alerts */
  retroactiveScan(): Observable<void> {
    return this.http.post<void>(`${this.base}/analytics/retroactive-scan`, {}, { headers: this.headers() });
  }

  /** Returns all groups with member counts and owner names */
  getAllGroups(): Observable<ChatGroupAdmin[]> {
    return this.http.get<ChatGroupAdmin[]>(`${this.base}/groups`, { headers: this.headers() });
  }

  /** Permanently deletes a group */
  deleteGroup(groupId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/groups/${groupId}`, { headers: this.headers() });
  }

  /** Updates a group's name, description, and category */
  updateGroup(groupId: string, dto: ChatGroupAdmin): Observable<void> {
    return this.http.put<void>(`${this.base}/groups/${groupId}`, dto, { headers: this.headers() });
  }

  /**
   * Posts an official announcement.
   * If scheduledAt is provided, the post won't appear in the feed until that time.
   */
  postAnnouncement(content: string, groupId?: string, scheduledAt?: string): Observable<void> {
    return this.http.post<void>(`${this.base}/announcement`, { content, groupId, scheduledAt }, { headers: this.headers() });
  }

  /** Returns future-dated announcements that haven't been published yet */
  getScheduledAnnouncements(): Observable<PublicationDto[]> {
    return this.http.get<PublicationDto[]>(`${this.base}/announcements/scheduled`, { headers: this.headers() });
  }

  /** Returns all groups a specific user belongs to */
  getUserGroups(userId: number): Observable<ChatGroupAdmin[]> {
    return this.http.get<ChatGroupAdmin[]>(`${this.base}/users/${userId}/groups`, { headers: this.headers() });
  }

  /** Alias for dismissFlag — clears the moderation flag without deleting */
  approvePost(publicationId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/moderation/${publicationId}/approve`, {}, { headers: this.headers() });
  }

  /** Alias for suspendUser */
  banUser(userId: number): Observable<void> {
    return this.http.post<void>(`${this.base}/moderation/users/${userId}/ban`, {}, { headers: this.headers() });
  }

  /** Returns counts of posts, messages, comments, and shares */
  getEngagementMix(): Observable<EngagementMix> {
    return this.http.get<EngagementMix>(`${this.base}/analytics/engagement-mix`, { headers: this.headers() });
  }

  /** Returns positive/neutral/negative sentiment breakdown across all content */
  getSentimentDistribution(): Observable<SentimentDistribution> {
    return this.http.get<SentimentDistribution>(`${this.base}/analytics/sentiment-distribution`, { headers: this.headers() });
  }

  /** Returns AI usage statistics */
  getAiImpact(): Observable<AiImpact> {
    return this.http.get<AiImpact>(`${this.base}/analytics/ai-impact`, { headers: this.headers() });
  }

  /** Returns the AI-generated clinical pulse (thematic analysis of recent content) */
  getPulse(): Observable<ClinicalPulse> {
    return this.http.get<ClinicalPulse>(`${this.base}/analytics/clinical-pulse`, { headers: this.headers() });
  }

  /** Returns the AI handover retrospective for a specific group and time window */
  getRetrospective(groupId: string, hours: number): Observable<any> {
    return this.http.get<any>(`${this.base}/analytics/retrospective`, {
      headers: this.headers(),
      params: { groupId, hours: String(hours) }
    });
  }

  /** Admin creates a new group (can be marked as default for a role) */
  createGroup(dto: {
    name: string; description: string; category: string;
    isDefault: boolean; defaultForRole: string | null;
  }): Observable<void> {
    return this.http.post<void>(`${this.base}/groups/create`, dto, { headers: this.headers() });
  }

  /** Returns all default role-based groups */
  getDefaultGroups(): Observable<ChatGroupAdmin[]> {
    return this.http.get<ChatGroupAdmin[]>(`${this.base}/groups/default`, { headers: this.headers() });
  }

  /** Returns 50 most recent posts for content browser */
  getRecentPosts(): Observable<ContentItem[]> {
    return this.http.get<ContentItem[]>(`${this.base}/content/posts`, { headers: this.headers() });
  }

  /** Returns 100 most recent group messages for content browser */
  getRecentGroupMessages(): Observable<ContentItem[]> {
    return this.http.get<ContentItem[]>(`${this.base}/content/messages`, { headers: this.headers() });
  }

  /** Admin force-deletes any post */
  adminDeletePost(postId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/content/posts/${postId}`, { headers: this.headers() });
  }

  /** Admin force-deletes a group message */
  adminDeleteMessage(messageId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/content/messages/${messageId}`, { headers: this.headers() });
  }

  /** Auto-joins a user into all default groups for their role */
  autoJoinDefaultGroups(userId: number, role: string): Observable<void> {
    return this.http.post<void>(`${this.base}/users/${userId}/auto-join`, null, {
      headers: this.headers(),
      params: { role }
    });
  }
}
