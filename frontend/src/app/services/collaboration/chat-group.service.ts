import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
 
export interface MemberDto {
  id: number;
  name: string;
  role?: string;
}
 
export interface ChatGroupDto {
  id: number;
  name: string;
  description: string;
  theme?: string;
  category?: string;
  createdAt?: string;
  members: MemberDto[];
  ownerId?: number;
  ownerName?: string;
}

export interface GroupJoinRequest {
  id: number;
  user: { id: number; nom: string; prenom: string };
  group: ChatGroupDto;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}
 
export interface ChatGroupCreateRequest {
  name: string;
  description: string;
  theme: string;
  ownerId: number;
  memberIds: number[];
}
 
@Injectable({
  providedIn: 'root'
})
export class ChatGroupService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/groups';
 
  public groups = signal<ChatGroupDto[]>([]);
  public activeGroup = signal<ChatGroupDto | null>(null);
 
  fetchGroups() {
    this.http.get<ChatGroupDto[]>(this.baseUrl).subscribe(data => this.groups.set(data));
  }
 
  createGroup(grp: ChatGroupCreateRequest) {
    return this.http.post<ChatGroupDto>(this.baseUrl, grp);
  }

  getGroupById(id: number) {
    return this.http.get<ChatGroupDto>(`${this.baseUrl}/${id}`);
  }
 
  deleteGroup(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
 
  joinGroup(groupId: number, userId: number) {
    return this.http.post(`${this.baseUrl}/${groupId}/join/${userId}`, {});
  }

  leaveGroup(groupId: number, userId: number) {
    return this.http.post(`${this.baseUrl}/${groupId}/leave/${userId}`, {});
  }

  requestJoin(groupId: number, userId: number) {
    return this.http.post(`${this.baseUrl}/${groupId}/request-join/${userId}`, {});
  }

  getPendingRequests(ownerId: number) {
    return this.http.get<GroupJoinRequest[]>(`${this.baseUrl}/owner/${ownerId}/pending-requests`);
  }

  approveRequest(requestId: number) {
    return this.http.post(`${this.baseUrl}/requests/${requestId}/approve`, {});
  }

  rejectRequest(requestId: number) {
    return this.http.post(`${this.baseUrl}/requests/${requestId}/reject`, {});
  }

  setActiveGroup(group: ChatGroupDto | null) {
    this.activeGroup.set(group);
  }

  updateGroup(id: number, grp: ChatGroupCreateRequest) {
    return this.http.put<ChatGroupDto>(`${this.baseUrl}/${id}`, grp).subscribe(() => this.fetchGroups());
  }
}
