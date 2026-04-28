import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** A group member with their resolved display name */
export interface MemberDto {
  id: number;
  name: string;
  role?: string;
}

/**
 * Represents a chat group (community circle) as returned by the backend.
 * id is a MongoDB ObjectId string.
 * members is resolved from backpi user IDs at read time.
 */
export interface ChatGroupDto {
  id: string;
  name: string;
  description: string;
  theme?: string;
  category?: string;
  createdAt?: string;
  members: MemberDto[];
  ownerId?: number;
  ownerName?: string;
}

/** A pending join request from a user wanting to join a group */
export interface GroupJoinRequest {
  id: string;
  userId: number;
  groupId: string;
  groupName: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

/** Payload for creating a new group */
export interface ChatGroupCreateRequest {
  name: string;
  description: string;
  theme: string;
  ownerId: number;
  memberIds: number[];
}

/**
 * Angular service for all chat group HTTP operations.
 *
 * All requests go through the API Gateway (port 8080).
 *
 * State management:
 *   groups signal — the full list of all groups (loaded once, refreshed on mutations)
 *   activeGroup signal — the currently open group in the messenger
 *
 * The activeGroup signal is set by the messenger component when a user clicks a group.
 * Other components (feed, messenger sidebar) read it to know which group is active.
 */
@Injectable({ providedIn: 'root' })
export class ChatGroupService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/groups`;

  /** All available groups — loaded on app init and refreshed after mutations */
  public groups = signal<ChatGroupDto[]>([]);

  /** The group currently open in the messenger — null when no group is selected */
  public activeGroup = signal<ChatGroupDto | null>(null);

  /** Loads all groups and stores them in the groups signal */
  fetchGroups() {
    this.http.get<ChatGroupDto[]>(this.apiUrl).subscribe(data => this.groups.set(data));
  }

  /** Creates a new group. The owner is automatically added as a member by the backend. */
  createGroup(grp: ChatGroupCreateRequest) {
    return this.http.post<ChatGroupDto>(this.apiUrl, grp);
  }

  /** Fetches a single group by its MongoDB ObjectId */
  getGroupById(id: string) {
    return this.http.get<ChatGroupDto>(`${this.apiUrl}/${id}`);
  }

  /** Permanently deletes a group */
  deleteGroup(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /** Adds a user directly to a group (no approval needed) */
  joinGroup(groupId: string, userId: number) {
    return this.http.post(`${this.apiUrl}/${groupId}/join/${userId}`, {});
  }

  /** Removes a user from a group */
  leaveGroup(groupId: string, userId: number) {
    return this.http.post(`${this.apiUrl}/${groupId}/leave/${userId}`, {});
  }

  /**
   * Submits a join request for a private group.
   * The group owner receives a notification and can approve or reject.
   * Does nothing if a PENDING request already exists.
   */
  requestJoin(groupId: string, userId: number) {
    return this.http.post(`${this.apiUrl}/${groupId}/request-join/${userId}`, {});
  }

  /** Returns all PENDING join requests for groups owned by this user */
  getPendingRequests(ownerId: number) {
    return this.http.get<GroupJoinRequest[]>(`${this.apiUrl}/owner/${ownerId}/pending-requests`);
  }

  /** Approves a join request — user is added to the group and notified */
  approveRequest(requestId: string) {
    return this.http.post(`${this.apiUrl}/requests/${requestId}/approve`, {});
  }

  /** Rejects a join request — user is not added */
  rejectRequest(requestId: string) {
    return this.http.post(`${this.apiUrl}/requests/${requestId}/reject`, {});
  }

  /** Sets the active group signal (used by the messenger component) */
  setActiveGroup(group: ChatGroupDto | null) {
    this.activeGroup.set(group);
  }

  /** Updates a group's name, description, and theme, then refreshes the groups list */
  updateGroup(id: string, grp: ChatGroupCreateRequest) {
    return this.http.put<ChatGroupDto>(`${this.apiUrl}/${id}`, grp).subscribe(() => this.fetchGroups());
  }
}
