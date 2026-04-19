import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
 
export interface Notification {
  id?: string;
  receiverId: number;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}
 
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/notifications';
  public notifications = signal<Notification[]>([]);
  public unreadCount = signal<number>(0);
 
  fetchNotifications(uid: number) {
    this.http.get<Notification[]>(`${this.baseUrl}/user/${uid}`).subscribe(data => {
      this.notifications.set(data);
      this.updateUnreadCount();
    });
  }
 
  markAsRead(id: string) {
    this.http.put(`${this.baseUrl}/${id}/read`, {}).subscribe(() => {
        this.notifications.update(list => list.map(n => n.id === id ? {...n, isRead: true} : n));
        this.updateUnreadCount();
    });
  }

  deleteNotification(id: string) {
    return this.http.delete(`${this.baseUrl}/${id}`).subscribe(() => {
        this.notifications.update(list => list.filter(n => n.id !== id));
        this.updateUnreadCount();
    });
  }
 
  updateUnreadCount() {
    this.unreadCount.set(this.notifications().filter(n => !n.isRead).length);
  }

  addNotification(notification: Notification) {
    this.notifications.update(list => [notification, ...list]);
    this.updateUnreadCount();
  }
}
