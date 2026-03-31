import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
 
export interface CommentCreateRequest {
  content: string;
  authorId: number;
  publicationId: number;
}
 
@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/comments';
 
  createComment(req: CommentCreateRequest) {
    return this.http.post(this.baseUrl, req);
  }
 
  updateComment(id: number, req: CommentCreateRequest) {
    return this.http.put(`${this.baseUrl}/${id}`, req);
  }
 
  deleteComment(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
