import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';


export interface CommentCreateRequest {
  content: string;
  authorId: number;
  /** MongoDB ObjectId of the parent publication */
  publicationId: string;
}


@Injectable({ providedIn: 'root' })
export class CommentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/comments`;

 
  createComment(req: CommentCreateRequest) {
    return this.http.post(this.apiUrl, req);
  }

  
  updateComment(id: string, req: CommentCreateRequest) {
    return this.http.put(`${this.apiUrl}/${id}`, req);
  }

  
  deleteComment(id: string, publicationId: string) {
    return this.http.delete(`${this.apiUrl}/${id}`, { params: { publicationId } });
  }
}
