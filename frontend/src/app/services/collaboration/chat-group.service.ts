import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
 
export interface MemberDto {
  id: number;
  name: string;
}
 
export interface ChatGroupDto {
  id: number;
  name: string;
  description: string;
  theme?: string;
  category?: string;
  createdAt?: string;
  members: MemberDto[];
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
    return this.http.post<ChatGroupDto>(this.baseUrl, grp).subscribe(() => this.fetchGroups());
  }
 
  deleteGroup(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`).subscribe(() => this.fetchGroups());
  }
 
  joinGroup(groupId: number, userId: number) {
    this.http.post(`${this.baseUrl}/${groupId}/join/${userId}`, {}).subscribe(() => this.fetchGroups());
  }

  setActiveGroup(group: ChatGroupDto | null) {
    this.activeGroup.set(group);
  }

  updateGroup(id: number, grp: ChatGroupCreateRequest) {
    return this.http.put<ChatGroupDto>(`${this.baseUrl}/${id}`, grp).subscribe(() => this.fetchGroups());
  }
}
