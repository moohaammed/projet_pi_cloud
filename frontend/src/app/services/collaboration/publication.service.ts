import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface CommentDto {
  id: string;
  content: string;
  authorId: number;
  authorName?: string;
  createdAt: string;
  publicationId?: string;
}

export interface PollOptionDto {
  id?: string;
  text: string;
  votes?: number;
  /** User IDs who voted for this option â€” used to highlight the current user's choice */
  voterIds?: number[];
}

export interface SharedEventPreviewDto {
  id: string;
  title?: string;
  startDateTime?: string;
  location?: string;
  description?: string;
  imageUrl?: string;
}

export interface PublicationDto {
  id: string;
  content: string;
  type: string;
  authorId: number;
  authorName?: string;
  createdAt: string;
  
  mediaUrls?: string[];
  mimeTypes?: string[];
  
  mediaUrl?: string;
  mimeType?: string;
  
  distressed?: boolean;
  sentimentScore?: number;
  anonymous?: boolean;
  comments?: CommentDto[];
  pollQuestion?: string;
  pollOptions?: PollOptionDto[];
  groupId?: string;
  groupName?: string;
  commentCount?: number;
  shareCount?: number;
  linkedEventId?: string;
  linkedEvent?: SharedEventPreviewDto | null;
  supportCount?: number;
  supportIds?: string;
  tags?: string[];
}

export interface PublicationCreateRequest {
  content?: string;
  type: string;
  authorId: number;
  anonymous?: boolean;
  pollQuestion?: string;
  pollOptions?: string[];
  groupId?: string;
  linkedEventId?: string;
}

@Injectable({ providedIn: 'root' })
export class PublicationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/publications`;

  /** Currently loaded publications for the active feed view */
  public publications = signal<PublicationDto[]>([]);
  fetchPublications() {
    this.http.get<PublicationDto[]>(this.apiUrl).subscribe(data => this.publications.set(data));
  }

  fetchPersonalizedFeed(userId: number) {
    this.http.get<PublicationDto[]>(`${this.apiUrl}/feed/${userId}`).subscribe(data => this.publications.set(data));
  }

  fetchGroupFeed(groupId: string) {
    this.http.get<PublicationDto[]>(`${this.apiUrl}/group/${groupId}`).subscribe(data => this.publications.set(data));
  }

  createPublication(req: PublicationCreateRequest, files?: File[]) {
    const formData = new FormData();
    formData.append('content', req.content ?? '');
    formData.append('type', req.type);
    formData.append('authorId', req.authorId.toString());
    formData.append('anonymous', (req.anonymous || false).toString());
    if (req.pollQuestion) formData.append('pollQuestion', req.pollQuestion);
    if (req.pollOptions) req.pollOptions.forEach(opt => formData.append('pollOptions', opt));
    if (req.groupId) formData.append('groupId', req.groupId);
    if (req.linkedEventId != null) formData.append('linkedEventId', String(req.linkedEventId));
    
    if (files && files.length > 0) {
      files.forEach(file => formData.append('files', file));
    }
    
    return this.http.post<PublicationDto>(this.apiUrl, formData);
  }

  createPublicationJson(req: PublicationCreateRequest) {
    return this.http.post<PublicationDto>(`${this.apiUrl}/json`, req);
  }

  voteInPoll(pubId: string, optionIndex: number, userId: number) {
    return this.http.post<PublicationDto>(`${this.apiUrl}/${pubId}/poll/vote`, { optionIndex, userId });
  }

  toggleSupport(pubId: string, userId: number) {
    return this.http.post<PublicationDto>(`${this.apiUrl}/${pubId}/support`, { userId });
  }

  updatePublication(id: string, req: PublicationCreateRequest, files?: File[]) {
    const formData = new FormData();
    formData.append('content', req.content ?? '');
    formData.append('type', req.type);
    formData.append('authorId', req.authorId.toString());
    formData.append('anonymous', (req.anonymous || false).toString());
    
    if (files && files.length > 0) {
      files.forEach(file => formData.append('files', file));
    }
    
    return this.http.put<PublicationDto>(`${this.apiUrl}/${id}`, formData);
  }

  deletePublication(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}

