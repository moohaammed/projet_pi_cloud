import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { environment } from '../../../environments/environment';

/**
 * Represents a notification as returned by the backend.
 *
 * isRead — false when first created, set to true when the user clicks the notification.
 * type   — category string used by the frontend to choose icons and by the voice assistant
 *          to choose the right spoken prefix (e.g. "CAREBOT" → "CareBot says...").
 */
export interface Notification {
  id?: string;
  receiverId: number;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Angular service for notification state management and HTTP operations.
 *
 * Dual-channel architecture:
 *   1. HTTP (this service) — loads missed notifications on page load
 *   2. WebSocket (WebSocketService) — pushes new notifications in real time
 *
 * When a WebSocket notification arrives, the component calls addNotification()
 * to merge it into the local signal without a full HTTP reload.
 *
 * The unreadCount signal drives the notification badge in the UI.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/api/notifications`;

  /** All notifications for the current user, newest first */
  public notifications = signal<Notification[]>([]);

  /** Number of unread notifications — drives the badge in the UI */
  public unreadCount = signal<number>(0);

  /** Loads all notifications for a user from the backend (called on page load) */
  fetchNotifications(uid: number) {
    this.http.get<Notification[]>(`${this.apiUrl}/user/${uid}`).subscribe(data => {
      // Filter out CareBot notifications if user is a DOCTOR
      const filtered = this.authService.getRole() === 'DOCTOR' 
        ? data.filter(n => n.type !== 'CAREBOT') 
        : data;
      this.notifications.set(filtered);
      this.updateUnreadCount();
    });
  }

  /**
   * Marks a notification as read.
   * Updates the local signal immediately (optimistic update) without waiting for the server.
   */
  markAsRead(id: string) {
    this.http.put(`${this.apiUrl}/${id}/read`, {}).subscribe(() => {
        this.notifications.update(list => list.map(n => n.id === id ? {...n, isRead: true} : n));
        this.updateUnreadCount();
    });
  }

  /** Permanently deletes a notification and removes it from the local signal */
  deleteNotification(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => {
        this.notifications.update(list => list.filter(n => n.id !== id));
        this.updateUnreadCount();
    });
  }

  /** Recalculates the unread count from the current notifications signal */
  updateUnreadCount() {
    this.unreadCount.set(this.notifications().filter(n => !n.isRead).length);
  }

  /**
   * Adds a new notification to the top of the list.
   * Called by components when a WebSocket notification arrives,
   * so the UI updates instantly without an HTTP reload.
   */
  addNotification(notification: Notification) {
    // Skip CareBot notifications if user is a DOCTOR
    if (this.authService.getRole() === 'DOCTOR' && notification.type === 'CAREBOT') {
      return;
    }
    this.notifications.update(list => [notification, ...list]);
    this.updateUnreadCount();
  }
}
