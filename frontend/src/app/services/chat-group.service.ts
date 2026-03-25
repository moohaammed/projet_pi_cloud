import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface ChatGroup {
  id?: number;
  name: string;
  description: string;
  theme?: string;
  createdAt?: string;
  members?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatGroupService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/groups';

  public groups = signal<ChatGroup[]>([]);
  public activeGroup = signal<ChatGroup | null>(null);

  setActiveGroup(group: ChatGroup | null) {
      this.activeGroup.set(group);
  }

  fetchGroups() {
    this.http.get<ChatGroup[]>(this.baseUrl).subscribe(res => {
      this.groups.set(res);
    });
  }

  createGroup(grp: ChatGroup) {
    this.http.post<ChatGroup>(this.baseUrl, grp).subscribe(() => {
      this.fetchGroups();
    });
  }

  deleteGroup(id: number) {
    this.http.delete(`${this.baseUrl}/${id}`).subscribe(() => {
      this.fetchGroups();
    });
  }

  joinGroup(groupId: number, userId: number) {
    this.http.post<ChatGroup>(`${this.baseUrl}/${groupId}/join/${userId}`, {}).subscribe({
      next: () => this.fetchGroups(),
      error: (err) => console.error("Error joining group: ", err)
    });
  }
}
