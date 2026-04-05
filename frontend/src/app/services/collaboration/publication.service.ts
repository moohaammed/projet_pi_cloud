import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
 
export interface CommentDto {
  id: number;
  content: string;
  authorId: number;
  authorName?: string;
  createdAt: string;
}
 
export interface PollOptionDto {
  id?: number;
  text: string;
  votes?: number;
  voterIds?: number[];
}
 
export interface SharedEventPreviewDto {
  id: number;
  title?: string;
  startDateTime?: string;
  location?: string;
  description?: string;
  imageUrl?: string;
}

export interface PublicationDto {
  id: number;
  content: string;
  type: string;
  authorId: number;
  authorName?: string;
  createdAt: string;
  mediaUrl?: string;
  mimeType?: string;
  distressed?: boolean;
  sentimentScore?: number;
  anonymous?: boolean;
  comments?: CommentDto[];
  pollQuestion?: string;
  pollOptions?: PollOptionDto[];
  groupId?: number;
  groupName?: string;
  commentCount?: number;
  shareCount?: number;
  linkedEventId?: number;
  linkedEvent?: SharedEventPreviewDto | null;
}
 
export interface PublicationCreateRequest {
  content?: string;
  type: string;
  authorId: number;
  anonymous?: boolean;
  pollQuestion?: string;
  pollOptions?: string[]; // Simplified for creation
  groupId?: number;
  /** Education calendar event id when type is EVENT */
  linkedEventId?: number;
}
 
@Injectable({
  providedIn: 'root'
})
export class PublicationService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/publications';
  public publications = signal<PublicationDto[]>([]);
 
  fetchPublications() {
    this.http.get<PublicationDto[]>(this.baseUrl).subscribe(data => this.publications.set(data));
  }

  fetchPersonalizedFeed(userId: number) {
    this.http.get<PublicationDto[]>(`${this.baseUrl}/feed/${userId}`).subscribe(data => this.publications.set(data));
  }

  fetchGroupFeed(groupId: number) {
    this.http.get<PublicationDto[]>(`${this.baseUrl}/group/${groupId}`).subscribe(data => this.publications.set(data));
  }
 
  createPublication(req: PublicationCreateRequest, file?: File) {
    const formData = new FormData();
    formData.append('content', req.content ?? '');
    formData.append('type', req.type);
    formData.append('authorId', req.authorId.toString());
    formData.append('anonymous', (req.anonymous || false).toString());
    if (req.pollQuestion) formData.append('pollQuestion', req.pollQuestion);
    if (req.pollOptions) {
      req.pollOptions.forEach(opt => formData.append('pollOptions', opt));
    }
    if (req.groupId) formData.append('groupId', req.groupId.toString());
    if (req.linkedEventId != null) formData.append('linkedEventId', String(req.linkedEventId));
    if (file) formData.append('file', file);
    return this.http.post<PublicationDto>(this.baseUrl, formData);
  }
 
  voteInPoll(pubId: number, optionIndex: number, userId: number) {
    return this.http.post<PublicationDto>(`${this.baseUrl}/${pubId}/poll/vote`, { optionIndex, userId });
  }
 
  updatePublication(id: number, req: PublicationCreateRequest, file?: File) {
    const formData = new FormData();
    formData.append('content', req.content ?? '');
    formData.append('type', req.type);
    formData.append('authorId', req.authorId.toString());
    formData.append('anonymous', (req.anonymous || false).toString());
    if (file) formData.append('file', file);
    return this.http.put<PublicationDto>(`${this.baseUrl}/${id}`, formData);
  }
 
  deletePublication(id: number) {
    const url = `${this.baseUrl}/${id}`;
    return this.http.delete(url);
  }
}
