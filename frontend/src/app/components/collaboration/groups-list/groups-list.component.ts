import { Component, inject, OnInit, signal, effect, untracked, PLATFORM_ID, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ChatGroupService, ChatGroupDto, GroupJoinRequest } from '../../../services/collaboration/chat-group.service';
import { AlzUserService } from '../../../services/alz-user.service';
import { MiniChatWidgetComponent } from '../mini-chat-widget/mini-chat-widget.component';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/collaboration/notification.service';
import { GuidanceService } from '../../../services/collaboration/guidance.service';
import { VoiceConversationService } from '../../../services/collaboration/voice-conversation.service';
import { SpeakOnHoverDirective } from '../../../directives/speak-on-hover.directive';
import { VoiceWelcomeComponent } from '../voice-welcome/voice-welcome.component';
import { VoiceConversationComponent } from '../voice-conversation/voice-conversation.component';
import { AdminCollaborationService } from '../../../services/collaboration/admin-collaboration.service';
import { FloatingAssistantComponent } from '../floating-assistant/floating-assistant.component';

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MiniChatWidgetComponent, SpeakOnHoverDirective, VoiceWelcomeComponent, VoiceConversationComponent, FloatingAssistantComponent],
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
  guidanceService = inject(GuidanceService);
  convService = inject(VoiceConversationService);
  adminApi = inject(AdminCollaborationService);

  currentUserId = signal<number>(this.authService.getCurrentUser()?.id || 1);
  notifications = computed(() => this.notificationService.notifications());
  unreadCount = computed(() => this.notificationService.unreadCount());
  searchQuery = signal<string>('');
  selectedCategory = signal<string>('ALL');
  sortBy = signal<string>('NAME_ASC');
  showOnlyMyGroups = signal<boolean>(false);
  /** Extra keyword tags the user can toggle to narrow results */
  activeTopics = signal<string[]>([]);

  /** All unique topics derived from group names + descriptions */
  availableTopics = computed(() => {
    const words = new Set<string>();
    this.chatGroupService.groups().forEach(g => {
      [g.name, g.description].forEach(text => {
        text?.toLowerCase().split(/\W+/).filter(w => w.length > 3).forEach(w => words.add(w));
      });
    });
    return Array.from(words).slice(0, 20); // cap at 20 topic chips
  });

  filteredGroups = computed(() => {
    let list = this.chatGroupService.groups();
    const cat    = this.selectedCategory();
    const q      = this.searchQuery().toLowerCase();
    const sort   = this.sortBy();
    const onlyMy = this.showOnlyMyGroups();
    const topics = this.activeTopics();

    if (onlyMy)       list = list.filter(g => this.isMember(g));
    if (cat !== 'ALL') list = list.filter(g => g.theme === cat);

    if (q) {
      list = list.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q)
      );
    }

    if (topics.length > 0) {
      list = list.filter(g =>
        topics.every(t =>
          g.name.toLowerCase().includes(t) ||
          g.description?.toLowerCase().includes(t)
        )
      );
    }

    list = [...list].sort((a, b) => {
      if (sort === 'NAME_ASC')      return a.name.localeCompare(b.name);
      if (sort === 'NAME_DESC')     return b.name.localeCompare(a.name);
      if (sort === 'MEMBERS_DESC')  return (b.members?.length || 0) - (a.members?.length || 0);
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
      this.guidanceService.loadAndSpeak('groups');
      const user = this.authService.getCurrentUser();
      if (user?.id && user?.role) {
        this.adminApi.autoJoinDefaultGroups(user.id, user.role).subscribe({
          next: () => this.chatGroupService.fetchGroups(), // refresh after auto-join
          error: () => {} // silent fail — not critical
        });
      }
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

  requestJoin(groupId: string) {
    const grp = this.chatGroupService.groups().find(g => g.id === groupId);
    const name = grp?.name || 'this group';
    this.convService.ask({
      question: `Would you like to send a request to join ${name}?`,
      actions: [
        {
          label: 'Yes, join',
          keyword: ['yes', 'sure', 'okay', 'join', 'send'],
          callback: () => {
            this.chatGroupService.requestJoin(groupId, this.currentUserId()).subscribe({
              next: () => {
                this.guidanceService.speakImmediate(`Your request to join ${name} has been sent.`);
                this.refreshData();
              },
              error: () => this.guidanceService.speakImmediate('Sorry, the request could not be sent.')
            });
          }
        },
        {
          label: 'No, cancel',
          keyword: ['no', 'cancel', 'skip'],
          callback: () => this.guidanceService.speakImmediate('Okay, no request sent.')
        }
      ]
    });
  }

  approveRequest(requestId: string) {
    this.chatGroupService.approveRequest(requestId).subscribe(() => {
      this.refreshData();
    });
  }

  rejectRequest(requestId: string) {
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

  leaveGroup(groupId: string) {
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

  toggleTopic(topic: string) {
    this.activeTopics.update(topics =>
      topics.includes(topic) ? topics.filter(t => t !== topic) : [...topics, topic]
    );
  }

  clearSearch() {
    this.searchQuery.set('');
    this.activeTopics.set([]);
    this.selectedCategory.set('ALL');
  }

  getUserName(userId: number): string {
    const user = this.userService.users().find(u => u.id === userId);
    if (user) {
      return `${user.prenom || ''} ${user.nom || ''}`.trim() || `User ${userId}`;
    }
    return `User ${userId}`;
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
