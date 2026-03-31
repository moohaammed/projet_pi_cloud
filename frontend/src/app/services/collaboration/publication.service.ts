import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
 
export interface CommentDto {
  id: number;
  content: string;
  authorId: number;
  authorName?: string;
  createdAt: string;
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
}
 
export interface PublicationCreateRequest {
  content: string;
  type: string;
  authorId: number;
  anonymous?: boolean;
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
 
  createPublication(req: PublicationCreateRequest, file?: File) {
    const formData = new FormData();
    formData.append('content', req.content);
    formData.append('type', req.type);
    formData.append('authorId', req.authorId.toString());
    formData.append('anonymous', (req.anonymous || false).toString());
    if (file) formData.append('file', file);
    return this.http.post<PublicationDto>(this.baseUrl, formData).subscribe(() => this.fetchPublications());
  }
 
  updatePublication(id: number, req: PublicationCreateRequest, file?: File) {
    const formData = new FormData();
    formData.append('content', req.content);
    formData.append('type', req.type);
    formData.append('authorId', req.authorId.toString());
    formData.append('anonymous', (req.anonymous || false).toString());
    if (file) formData.append('file', file);
    return this.http.put<PublicationDto>(`${this.baseUrl}/${id}`, formData).subscribe(() => this.fetchPublications());
  }
 
  deletePublication(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`).subscribe(() => this.fetchPublications());
  }
}
