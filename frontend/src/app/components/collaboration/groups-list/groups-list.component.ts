import { Component, inject, OnInit, signal, effect, untracked, PLATFORM_ID, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ChatGroupService, ChatGroupDto } from '../../../services/collaboration/chat-group.service';
import { AlzUserService } from '../../../services/alz-user.service';
import { MiniChatWidgetComponent } from '../mini-chat-widget/mini-chat-widget.component';
import { AuthService } from '../../../services/auth.service';

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

  currentUserId = signal<number>(this.authService.getCurrentUser()?.id || 1);
  groups = computed(() => this.chatGroupService.groups());
  users = computed(() => this.userService.users());

  newGroupName = '';
  newGroupDesc = '';
  newGroupTheme = 'SUPPORT';
  selectedUserIds: number[] = [];

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
      this.chatGroupService.fetchGroups();
    });
  }

  joinGroup(groupId: number) {
    this.chatGroupService.joinGroup(groupId, this.currentUserId()).subscribe(() => {
      this.chatGroupService.fetchGroups();
    });
  }

  enterGroup(grp: ChatGroupDto) {
    this.chatGroupService.activeGroup.set(grp);
    this.router.navigate(['/collaboration/messenger']);
  }

  isMemberOf(grp: ChatGroupDto): boolean {
    return grp.members.some(m => m.id === this.currentUserId());
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
