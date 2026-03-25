import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Comment {
  id?: number;
  content: string;
  createdAt?: string;
  author?: any;
  publication?: any;
}

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/comments';

  createComment(comment: Comment) {
    return this.http.post<Comment>(this.baseUrl, comment);
  }

  getCommentsByPublication(pubId: number) {
    return this.http.get<Comment[]>(`${this.baseUrl}/publication/${pubId}`);
  }

  deleteComment(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
