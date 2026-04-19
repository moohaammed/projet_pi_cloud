import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MiniChatWidgetComponent } from '../mini-chat-widget/mini-chat-widget.component';
import { ChatGroupService } from '../../../services/collaboration/chat-group.service';
import { AlzUserService } from '../../../services/alz-user.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/collaboration/notification.service';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-communication-test',
  standalone: true,
  imports: [CommonModule, RouterModule, MiniChatWidgetComponent, FormsModule],
  templateUrl: './communication-test.component.html',
  styleUrls: ['./communication-test.component.scss']
})
export class CommunicationTestComponent implements OnInit {
  private chatGroupService = inject(ChatGroupService);
  private userService = inject(AlzUserService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  currentUserId = signal<number>(this.authService.getCurrentUser()?.id || 1);
  currentUser = computed(() => this.authService.getCurrentUser());

  notifications = computed(() => this.notificationService.notifications());
  unreadCount = computed(() => this.notificationService.unreadCount());

  // Admin detection: hide sidebar when ADMIN role or on /collaboration/admin route
  private currentUrl = signal<string>(this.router.url);
  isAdmin = computed(() => {
    const role = this.authService.getRole();
    return role === 'ADMIN' || this.currentUrl().includes('/collaboration/admin');
  });

  // Search state for sidebar
  groupSearchQuery = signal<string>('');

  // Pinned Care Board (Mock state preserved)
  pinnedMessages = signal<any[]>([]);

  // Navigation & Social State
  joinedGroups = computed(() => {
    const uid = this.currentUserId();
    return this.chatGroupService.groups().filter(g => 
      g.members.some(m => m.id === uid)
    );
  });

  contacts = computed(() => {
    const uid = this.currentUserId();
    return this.userService.users().filter(u => u.id !== uid);
  });

  ngOnInit() {
    // Track URL changes so isAdmin() reactive computation stays in sync
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => this.currentUrl.set(e.urlAfterRedirects || e.url));

    this.chatGroupService.fetchGroups();
    this.userService.fetchUsers();
    const uid = this.currentUserId();
    if (uid) {
      this.notificationService.fetchNotifications(uid);
    }
  }

  markAsRead(id: string) {
    this.notificationService.markAsRead(id);
  }

  deleteNotification(id: string) {
    this.notificationService.deleteNotification(id);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  isRouteActive(route: string): boolean {
    return this.router.url.includes(route);
  }

  unpinMessage(id: string) {
    this.pinnedMessages.set(this.pinnedMessages().filter(m => m.id !== id));
  }
}
