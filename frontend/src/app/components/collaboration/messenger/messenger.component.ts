import { Component, inject, OnInit, signal, effect, untracked, PLATFORM_ID, computed, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PublicationDto } from '../../../services/collaboration/publication.service';
import { MessageService, MessageDto } from '../../../services/collaboration/message.service';
import { ChatGroupService, ChatGroupDto, MemberDto } from '../../../services/collaboration/chat-group.service';
import { UserService } from '../../../services/user.service';
import { WebSocketService } from '../../../services/collaboration/websocket.service';
import { NotificationService } from '../../../services/collaboration/notification.service';
import { MiniChatWidgetComponent } from '../mini-chat-widget/mini-chat-widget.component';
import { CareRelayService, HandoverDTO } from '../../../services/collaboration/care-relay.service';

@Component({
  selector: 'app-messenger',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MiniChatWidgetComponent],
  templateUrl: './messenger.component.html',
  styleUrls: ['./messenger.component.scss']
})
export class MessengerComponent implements OnInit {
  messageService = inject(MessageService);
  chatGroupService = inject(ChatGroupService);
  userService = inject(UserService);
  webSocketService = inject(WebSocketService);
  sanitizer = inject(DomSanitizer);
  notificationService = inject(NotificationService);
  careRelayService = inject(CareRelayService);
  platformId = inject(PLATFORM_ID);

  currentUserId = signal<number>(1);
  activeChatType = signal<'GROUP' | 'DM'>('GROUP');
  activeDmUserId = signal<number | null>(null);
  showInfoSidebar = signal<boolean>(false);
  showHandoverPanel = signal<boolean>(false);
  handoverData = computed(() => this.careRelayService.handover());
  handoverLoading = computed(() => this.careRelayService.loading());

  activeGroup = computed(() => this.chatGroupService.activeGroup());
  groups = computed(() => {
    const allGroups = this.chatGroupService.groups();
    const uid = this.currentUserId();
    return allGroups.filter(grp => grp.members.some(m => m.id === uid));
  });
  users = computed(() => this.userService.users());
  
  newGroupMessage = '';
  dmContent = '';
  dmUserSearch = signal<string>('');
  selectedMessageFile: File | null = null;
  searchQuery = signal<string>('');
  replyingTo: MessageDto | null = null;

  isPollMode = signal<boolean>(false);
  pollQuestion = '';
  pollOptions = signal<string[]>(['', '']);

  // @mention state
  mentionQuery = signal<string>('');
  showMentionDropdown = signal<boolean>(false);
  mentionSuggestions = computed(() => {
    const q = this.mentionQuery().toLowerCase();
    const grp = this.activeGroup();
    const me = this.currentUserId();
    if (!grp || !q) return [];
    return grp.members.filter((m: any) =>
      m.id !== me && m.name?.toLowerCase().includes(q)
    );
  });

  filteredDmUsers = computed(() => {
    const users = this.userService.users();
    const uid = this.currentUserId();
    const q = this.dmUserSearch().toLowerCase();
    return users.filter((u: any) => u.id !== uid && (u.name?.toLowerCase().includes(q) || u.id!.toString().includes(q)));
  });

  filteredMessages = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const msgs = this.activeChatType() === 'GROUP' ? this.messageService.messages() : this.dmMessages();
    if (!q) return [...msgs].reverse();
    return msgs.filter((m: any) => m.content?.toLowerCase().includes(q)).reverse();
  });

  pinnedMessages = computed(() => {
    return this.filteredMessages().filter(m => m.pinned);
  });

  sharedMedia = computed(() => {
    return this.messageService.messages().filter(m => !!m.mediaUrl);
  });

  dmMessages = signal<MessageDto[]>([]);

  constructor() {
    effect(() => {
      const newMsg = this.webSocketService.realtimeMessage() as any;
      if (newMsg) {
        untracked(() => {
          if (newMsg.content === '__DELETED__') {
            this.messageService.messages.update((msgs: any[]) => msgs.filter((m: any) => m.id !== newMsg.id));
            this.dmMessages.update((msgs: any[]) => msgs.filter((m: any) => m.id !== newMsg.id));
            return;
          }

          // Handle pinning update (message updated in place)
          const indexGroup = this.messageService.messages().findIndex(m => m.id === newMsg.id);
          if (indexGroup !== -1) {
            this.messageService.messages.update(msgs => {
              const copy = [...msgs];
              copy[indexGroup] = newMsg;
              return copy;
            });
            return;
          }

          const indexDm = this.dmMessages().findIndex(m => m.id === newMsg.id);
          if (indexDm !== -1) {
            this.dmMessages.update(msgs => {
              const copy = [...msgs];
              copy[indexDm] = newMsg;
              return copy;
            });
            return;
          }

          if (newMsg.chatGroupId && this.activeGroup()?.id === newMsg.chatGroupId) {
            this.messageService.messages.update(msgs => [newMsg, ...msgs]);
          } else if (newMsg.receiverId === this.currentUserId() || newMsg.senderId === this.currentUserId()) {
             const otherUserId = newMsg.senderId === this.currentUserId() ? newMsg.receiverId : newMsg.senderId;
             if (this.activeDmUserId() === otherUserId) {
               this.dmMessages.update(msgs => [newMsg, ...msgs]);
             }
          }
        });
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const uid = this.currentUserId();
      if (uid && isPlatformBrowser(this.platformId)) {
        untracked(() => {
          this.webSocketService.setUserId(uid);
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

  enterGroup(grp: ChatGroupDto) {
    this.searchQuery.set('');
    this.activeChatType.set('GROUP');
    this.activeDmUserId.set(null);
    this.chatGroupService.activeGroup.set(grp);
    this.messageService.fetchMessagesByGroup(grp.id!);
    this.webSocketService.subscribeToGroup(grp.id!);
  }

  openDmChat(userId: number) {
    this.searchQuery.set('');
    this.activeChatType.set('DM');
    this.activeDmUserId.set(userId);
    this.chatGroupService.activeGroup.set(null);
    this.messageService.fetchDirectMessages(this.currentUserId(), userId).subscribe(msgs => {
      this.dmMessages.set(msgs);
    });
  }

  sendGroupMessage(groupId: number) {
    if (this.isPollMode()) {
      this.submitPoll(groupId);
      return;
    }
    if (!this.newGroupMessage.trim() && !this.selectedMessageFile) return;
    this.messageService.createMessage({
      content: this.newGroupMessage,
      chatGroupId: groupId,
      senderId: this.currentUserId(),
      parentMessageId: this.replyingTo?.id,
      type: 'TEXT'
    }, this.selectedMessageFile || undefined).subscribe(() => {
      this.newGroupMessage = '';
      this.selectedMessageFile = null;
      this.replyingTo = null;
      this.messageService.fetchMessagesByGroup(groupId);
    });
  }

  submitPoll(groupId: number) {
    const validOptions = this.pollOptions().filter(o => !!o.trim());
    if (!this.pollQuestion.trim() || validOptions.length < 2) return;

    this.messageService.createMessage({
      content: '[Poll]', // Placeholder content for search/preview
      chatGroupId: groupId,
      senderId: this.currentUserId(),
      type: 'POLL',
      pollQuestion: this.pollQuestion,
      pollOptions: validOptions
    }).subscribe(() => {
      this.pollQuestion = '';
      this.pollOptions.set(['', '']);
      this.isPollMode.set(false);
      this.messageService.fetchMessagesByGroup(groupId);
    });
  }

  vote(messageId: number, optionId: number) {
    this.messageService.voteOnPoll(messageId, this.currentUserId(), optionId).subscribe(updatedMsg => {
       // Real-time update handled by WebSocket, but we can optimistically update if needed
    });
  }

  togglePin(msg: MessageDto) {
    this.messageService.togglePin(msg.id).subscribe(() => {
      // Update will come via WebSocket
    });
  }

  togglePollMode() {
    this.isPollMode.update(v => !v);
    if (!this.isPollMode()) {
      this.pollQuestion = '';
      this.pollOptions.set(['', '']);
    }
  }

  addPollOption() {
    if (this.pollOptions().length < 6) {
      this.pollOptions.update(opts => [...opts, '']);
    }
  }

  removePollOption(index: number) {
    if (this.pollOptions().length > 2) {
      this.pollOptions.update(opts => opts.filter((_, i) => i !== index));
    }
  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }

  sendDmMessage() {
    if (!this.dmContent.trim() || !this.activeDmUserId()) return;
    this.messageService.createMessage({
      content: this.dmContent,
      senderId: this.currentUserId(),
      receiverId: this.activeDmUserId()!
    }).subscribe(() => {
      this.dmContent = '';
      this.openDmChat(this.activeDmUserId()!);
    });
  }

  onMessageFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedMessageFile = file;
    }
  }

  setReply(msg: MessageDto) {
    this.replyingTo = msg;
  }

  cancelReply() {
    this.replyingTo = null;
  }

  closeChat() {
    this.chatGroupService.activeGroup.set(null);
  }

  leaveGroupAction(groupId: number) {
    if (confirm('Are you sure you want to leave this group?')) {
      this.chatGroupService.leaveGroup(groupId, this.currentUserId()).subscribe(() => {
        this.closeChat();
        this.chatGroupService.fetchGroups();
        this.showInfoSidebar.set(false);
      });
    }
  }

  toggleInfoSidebar() {
    this.showInfoSidebar.update(v => !v);
  }

  isMemberOf(grp: ChatGroupDto): boolean {
    return grp.members.some(m => m.id === this.currentUserId());
  }

  get dmUserName(): string {
    const user = this.userService.users().find(u => u.id === this.activeDmUserId());
    return user ? user.name || 'User ' + user.id : 'User ' + this.activeDmUserId();
  }

  toggleHandoverPanel() {
    if (!this.showHandoverPanel()) {
      const grp = this.activeGroup();
      if (grp) {
        this.careRelayService.loadHandover(grp.id!);
      }
    } else {
      this.careRelayService.clearHandover();
    }
    this.showHandoverPanel.update(v => !v);
  }

  getSentimentIcon(score: number): string {
    if (score > 0.3) return 'fa-face-smile text-success';
    if (score < -0.3) return 'fa-face-frown text-danger';
    return 'fa-face-meh text-warning';
  }

  /** Called on every keystroke in the group message input */
  onGroupMessageInput(value: string) {
    this.newGroupMessage = value;
    // Detect if the last typed word starts with @
    const lastWord = value.split(/\s/).pop() || '';
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      this.mentionQuery.set(lastWord.slice(1));
      this.showMentionDropdown.set(true);
    } else {
      this.showMentionDropdown.set(false);
      this.mentionQuery.set('');
    }
  }

  /** Replace the partial @query with @SelectedName and close dropdown */
  insertMention(member: any) {
    const words = this.newGroupMessage.split(/\s/);
    words[words.length - 1] = '@' + member.name + ' ';
    this.newGroupMessage = words.join(' ');
    this.showMentionDropdown.set(false);
    this.mentionQuery.set('');
  }

  formatMessage(content: string | undefined): SafeHtml {
    if (!content) return '';
    
    // Escape HTML first to prevent XSS
    let escaped = content.replace(/&/g, '&amp;')
                         .replace(/</g, '&lt;')
                         .replace(/>/g, '&gt;')
                         .replace(/"/g, '&quot;')
                         .replace(/'/g, '&#039;');

    // Regex to match anything starting with @ and continuing with valid name characters/spaces
    const mentionRegex = /@([a-zA-Z0-9À-ÿ._-]+(?:\s[a-zA-Z0-9À-ÿ._-]+)*)/g;
    
    const formatted = escaped.replace(mentionRegex, (match, fullName) => {
      const grp = this.activeGroup();
      if (!grp) return match;

      // Backtracking match: try the full matched name, then peel off words from the end
      // e.g., if we matched "@Rania Ghrissi hello", try:
      // 1. "Rania Ghrissi hello"
      // 2. "Rania Ghrissi" -> Match!
      let words = fullName.split(/\s+/);
      while (words.length > 0) {
        let candidate = words.join(' ');
        let member = grp.members.find(m => m.name?.toLowerCase() === candidate.toLowerCase());
        
        if (member) {
          // We found a match! Return the highlight span + any remaining words we peeled off
          const remainingWords = fullName.slice(candidate.length);
          return `<span class="mention-tag">@${member.name}</span>${remainingWords}`;
        }
        words.pop();
      }
      
      return match;
    });

    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }
}
