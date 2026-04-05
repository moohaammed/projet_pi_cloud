import { Component, inject, OnInit, signal, effect, untracked, PLATFORM_ID, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ChatGroupService, ChatGroupDto, GroupJoinRequest } from '../../../services/collaboration/chat-group.service';
import { AlzUserService } from '../../../services/alz-user.service';
import { MiniChatWidgetComponent } from '../mini-chat-widget/mini-chat-widget.component';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/collaboration/notification.service';

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MiniChatWidgetComponent],
  templateUrl: './groups-list.component.html',
  styleUrls: ['./groups-list.component.scss']
})
export class GroupsListComponent implements OnInit {
  authService = inject(AuthService);
  chatGroupService = inject(ChatGroupService);
  userService = inject(AlzUserService);
  router = inject(Router);
  platformId = inject(PLATFORM_ID);
  notificationService = inject(NotificationService);

  currentUserId = signal<number>(this.authService.getCurrentUser()?.id || 1);
  notifications = computed(() => this.notificationService.notifications());
  unreadCount = computed(() => this.notificationService.unreadCount());
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('ALL');
  sortBy = signal<string>('NAME_ASC');
  showOnlyMyGroups = signal<boolean>(false);

  filteredGroups = computed(() => {
    let list = this.chatGroupService.groups();
    const cat = this.selectedCategory();
    const q = this.searchQuery().toLowerCase();
    const sort = this.sortBy();
    const onlyMy = this.showOnlyMyGroups();

    // 0. Membership Filter (Optional toggle)
    if (onlyMy) {
      list = list.filter(g => this.isMember(g));
    }

    // 1. Theme Filter
    if (cat !== 'ALL') {
      list = list.filter(g => g.theme === cat);
    }
    
    // 2. Search Query
    if (q) {
      list = list.filter(g => 
        g.name.toLowerCase().includes(q) || 
        g.description.toLowerCase().includes(q)
      );
    }

    // 3. Sorting
    list = [...list].sort((a, b) => {
      if (sort === 'NAME_ASC') return a.name.localeCompare(b.name);
      if (sort === 'NAME_DESC') return b.name.localeCompare(a.name);
      if (sort === 'MEMBERS_DESC') return (b.members?.length || 0) - (a.members?.length || 0);
      return 0;
    });

    return list;
  });

  users = computed(() => this.userService.users());

  newGroupName = '';
  newGroupDesc = '';
  newGroupTheme = 'SUPPORT';
  selectedUserIds: number[] = [];

  pendingRequests = signal<GroupJoinRequest[]>([]);

  constructor() {
    effect(() => {
      const uid = this.currentUserId();
      if (uid && isPlatformBrowser(this.platformId)) {
        untracked(() => {
          this.refreshData();
        });
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.refreshData();
    }
  }

  refreshData() {
    this.chatGroupService.fetchGroups();
    this.userService.fetchUsers();
    const uid = this.currentUserId();
    if (uid) {
      this.notificationService.fetchNotifications(uid);
      this.fetchPendingRequests();
    }
  }

  fetchPendingRequests() {
    const uid = this.currentUserId();
    if (!uid) return;
    this.chatGroupService.getPendingRequests(uid).subscribe(reqs => {
      this.pendingRequests.set(reqs);
    });
  }

  requestJoin(groupId: number) {
    this.chatGroupService.requestJoin(groupId, this.currentUserId()).subscribe({
      next: () => {
        alert('Join request sent successfully!');
        this.refreshData();
      },
      error: (err) => alert(err.error?.message || err.message || 'Failed to send request')
    });
  }

  approveRequest(requestId: number) {
    this.chatGroupService.approveRequest(requestId).subscribe(() => {
      this.refreshData();
    });
  }

  rejectRequest(requestId: number) {
    this.chatGroupService.rejectRequest(requestId).subscribe(() => {
      this.refreshData();
    });
  }

  isMember(group: ChatGroupDto): boolean {
    return group.members.some(m => m.id === this.currentUserId());
  }

  createGroup() {
    if (this.newGroupName.trim().length < 3) return;
    this.chatGroupService.createGroup({
      name: this.newGroupName,
      description: this.newGroupDesc,
      theme: this.newGroupTheme as any,
      ownerId: this.currentUserId(),
      memberIds: [this.currentUserId(), ...this.selectedUserIds]
    }).subscribe(() => {
      this.newGroupName = '';
      this.newGroupDesc = '';
      this.selectedUserIds = [];
      this.refreshData();
    });
  }

  leaveGroup(groupId: number) {
    if (confirm('Are you sure you want to leave this community?')) {
      this.chatGroupService.leaveGroup(groupId, this.currentUserId()).subscribe(() => {
        this.refreshData();
      });
    }
  }

  enterGroup(grp: ChatGroupDto) {
    this.chatGroupService.activeGroup.set(grp);
    this.router.navigate(['/collaboration/groups', grp.id, 'feed']);
  }

  getThemeColor(theme?: string): string {
    switch (theme) {
      case 'SUPPORT': return '#006be6';
      case 'SOCIAL': return '#10b981';
      case 'REGIONAL': return '#f59e0b';
      case 'EMERGENCY': return '#ef4444';
      default: return '#6b7280';
    }
  }

  toggleUserSelection(id: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedUserIds.includes(id)) {
        this.selectedUserIds.push(id);
      }
    } else {
      this.selectedUserIds = this.selectedUserIds.filter(uid => uid !== id);
    }
  }
}
