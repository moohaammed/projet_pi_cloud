import { Component, inject, OnInit, signal, effect, untracked, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatGroupService, ChatGroupDto } from '../../../services/collaboration/chat-group.service';
import { UserService } from '../../../services/user.service';
import { WebSocketService } from '../../../services/collaboration/websocket.service';
import { MessageService } from '../../../services/collaboration/message.service';

@Component({
  selector: 'app-mini-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mini-chat-widget.component.html',
  styleUrls: ['./mini-chat-widget.component.scss']
})
export class MiniChatWidgetComponent implements OnInit {
  userService = inject(UserService);
  webSocketService = inject(WebSocketService);
  messageService = inject(MessageService);
  chatGroupService = inject(ChatGroupService);

  currentUserId = signal<number>(1); // Simulated user ID

  // Mini Chat State
  isMiniChatOpen = signal(false);
  activeMiniChatType = signal<'users' | 'groups'>('users');
  activeMiniChatUserId = signal<number | null>(null);
  activeMiniChatGroupId = signal<number | null>(null);
  miniChatSearch = signal('');
  miniChatInput = '';
  
  chatUsers = computed(() => this.userService.users().filter(u => u.id !== this.currentUserId()));
  filteredChatUsers = computed(() => {
    const q = this.miniChatSearch().toLowerCase();
    if (!q) return this.chatUsers();
    return this.chatUsers().filter(u => u.name?.toLowerCase().includes(q));
  });

  chatGroups = computed(() => this.chatGroupService.groups());
  filteredChatGroups = computed(() => {
    const q = this.miniChatSearch().toLowerCase();
    if (!q) return this.chatGroups();
    return this.chatGroups().filter((g: ChatGroupDto) => g.name?.toLowerCase().includes(q));
  });

  miniChatMessages = computed(() => {
    const activeUserId = this.activeMiniChatUserId();
    const activeGroupId = this.activeMiniChatGroupId();
    
    if (activeGroupId) {
      return [...this.messageService.messages().filter(m => m.chatGroupId === activeGroupId)].reverse();
    } else if (activeUserId) {
      return [...this.messageService.messages().filter(m => !m.chatGroupId && (m.senderId === activeUserId || m.receiverId === activeUserId))].reverse();
    }
    return [];
  });

  miniChatTitle = computed(() => {
    if (this.activeMiniChatUserId()) {
      const uid = this.activeMiniChatUserId();
      return this.userService.users().find(u => u.id === uid)?.name || `User ${uid}`;
    } else if (this.activeMiniChatGroupId()) {
      const gid = this.activeMiniChatGroupId();
      return this.chatGroupService.groups().find((g: ChatGroupDto) => g.id === gid)?.name || `Group ${gid}`;
    }
    return '';
  });

  constructor() {
    // Mini-chat WebSocket effect
    effect(() => {
      const newMsg = this.webSocketService.realtimeMessage();
      if (newMsg) {
        untracked(() => {
          const activeDm = this.activeMiniChatUserId();
          const activeGrp = this.activeMiniChatGroupId();
          const uid = this.currentUserId();
          
          let shouldAdd = false;
          if (activeGrp && newMsg.chatGroupId === activeGrp) {
            shouldAdd = true;
          } else if (activeDm && !newMsg.chatGroupId && 
             ((newMsg.senderId === uid && newMsg.receiverId === activeDm) ||
              (newMsg.senderId === activeDm && newMsg.receiverId === uid))) {
            shouldAdd = true;
          }
          
          if (shouldAdd) {
             const exists = this.messageService.messages().some(m => m.id === newMsg.id);
             if (!exists) {
               this.messageService.messages.update(msgs => [...msgs, newMsg]);
             }
          }
        });
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.userService.fetchUsers();
    this.chatGroupService.fetchGroups();
  }

  toggleMiniChat() {
    this.isMiniChatOpen.update(v => !v);
  }

  openMiniChatConversation(userId: number) {
    this.activeMiniChatUserId.set(userId);
    this.activeMiniChatGroupId.set(null);
    this.messageService.fetchDirectMessages(this.currentUserId(), userId)
      .subscribe(msgs => this.messageService.messages.set(msgs));
  }

  openMiniChatGroup(groupId: number) {
    this.activeMiniChatGroupId.set(groupId);
    this.activeMiniChatUserId.set(null);
    this.messageService.fetchMessagesByGroup(groupId);
  }

  closeMiniChatConversation() {
    this.activeMiniChatUserId.set(null);
    this.activeMiniChatGroupId.set(null);
    this.miniChatInput = '';
    this.messageService.messages.set([]);
  }

  sendMiniChatMessage() {
    const activeUserId = this.activeMiniChatUserId();
    const activeGroupId = this.activeMiniChatGroupId();
    if (!this.miniChatInput.trim() || (!activeUserId && !activeGroupId)) return;
    
    this.messageService.createMessage({
      content: this.miniChatInput,
      senderId: this.currentUserId(),
      receiverId: activeUserId || undefined,
      chatGroupId: activeGroupId || undefined
    }).subscribe(() => {
      this.miniChatInput = '';
      if (activeGroupId) {
        this.messageService.fetchMessagesByGroup(activeGroupId);
      } else if (activeUserId) {
        this.messageService.fetchDirectMessages(this.currentUserId(), activeUserId)
          .subscribe(msgs => this.messageService.messages.set(msgs));
      }
    });
  }
}
