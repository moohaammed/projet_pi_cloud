import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**
 * Payload for creating or updating a comment.
 * publicationId is required because comments are embedded inside publications —
 * the backend needs to know which publication to update.
 */
export interface CommentCreateRequest {
  content: string;
  authorId: number;
  /** MongoDB ObjectId of the parent publication */
  publicationId: string;
}

/**
 * Angular service for comment HTTP operations.
 *
 * All requests go through the API Gateway (port 8080).
 *
 * Design note — embedded comments:
 *   Comments are stored inside the Publication document in MongoDB (not a separate collection).
 *   This means every comment operation requires the publicationId so the backend
 *   can load the right publication, mutate its comments array, and save it back.
 *
 *   deleteComment requires publicationId as a query param so the backend can do a
 *   targeted findById(publicationId) instead of scanning all publications.
 */
@Injectable({ providedIn: 'root' })
export class CommentService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/comments';

  /**
   * Creates a new comment on a publication.
   * The backend adds the comment to the publication's embedded comments array
   * and sends a notification to the post author (if different from the commenter).
   */
  createComment(req: CommentCreateRequest) {
    return this.http.post(this.baseUrl, req);
  }

  /**
   * Updates the text content of an existing comment.
   * The publicationId in the request body is used to locate the parent publication.
   */
  updateComment(id: string, req: CommentCreateRequest) {
    return this.http.put(`${this.baseUrl}/${id}`, req);
  }

  /**
   * Permanently deletes a comment from its parent publication.
   * publicationId is required as a query param so the backend can do a targeted
   * findById(publicationId) lookup instead of scanning all publications.
   */
  deleteComment(id: string, publicationId: string) {
    return this.http.delete(`${this.baseUrl}/${id}`, { params: { publicationId } });
  }
}
