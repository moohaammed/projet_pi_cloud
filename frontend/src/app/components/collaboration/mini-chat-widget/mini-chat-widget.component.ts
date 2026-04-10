import { Component, inject, OnInit, signal, effect, untracked, computed, HostListener, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ChatGroupService, ChatGroupDto } from '../../../services/collaboration/chat-group.service';
import { AlzUserService } from '../../../services/alz-user.service';
import { WebSocketService } from '../../../services/collaboration/websocket.service';
import { MessageService, MessageDto } from '../../../services/collaboration/message.service';
import { AuthService } from '../../../services/auth.service';
import { CareBotService } from '../../../services/collaboration/care-bot.service';

@Component({
  selector: 'app-mini-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mini-chat-widget.component.html',
  styleUrls: ['./mini-chat-widget.component.scss']
})
export class MiniChatWidgetComponent implements OnInit {
  authService = inject(AuthService);
  userService = inject(AlzUserService);
  webSocketService = inject(WebSocketService);
  messageService = inject(MessageService);
  chatGroupService = inject(ChatGroupService);
  router = inject(Router);
  sanitizer = inject(DomSanitizer);
  careBotApi = inject(CareBotService);

  currentUserId = signal<number>(this.authService.getCurrentUser()?.id || 1); 

  // Mini Chat State
  isMiniChatOpen = signal(false);
  activeMiniChatType = signal<'users' | 'groups'>('users');
  activeMiniChatUserId = signal<number | null>(null);
  activeMiniChatGroupId = signal<string | null>(null);
  miniChatSearch = signal('');
  miniChatInput = '';
  
  replyingTo: MessageDto | null = null;
  selectedMessageFile: File | null = null;
  medicationReminderAnsweredIds = signal<Set<string>>(new Set());
  medReminderAckLoading = signal<boolean>(false);

  // Poll State
  isPollMode = signal<boolean>(false);
  pollQuestion = '';
  pollOptions = signal<string[]>(['', '']);

  // Mention State
  mentionQuery = signal<string>('');
  showMentionDropdown = signal<boolean>(false);
  
  // Emoji State
  showEmojiPicker = signal<boolean>(false);

  readonly EMOJI_LIST = [
    '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😻','😼','😽','🙀','😿','😾',
    '👋','🤚','🖐','✋','🖖','👌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦿','🦶','👣','👂','🦻','👃','🧠','🦷','🦴','👀','👁','👅','👄',
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉','☸️','✡️','🔯',
    '🔥','✨','⭐','🌟','☁️','☀️','🌈','☘️','🍀','🌸','🌹','🌻','🌱','🌿','🍃','🍂','🍁','🍄','🌾','🌵','🌴','🌳','🌲'
  ];

  chatUsers = computed(() => this.userService.users().filter(u => u.id !== this.currentUserId()));
  filteredChatUsers = computed(() => {
    const q = this.miniChatSearch().toLowerCase();
    if (!q) return this.chatUsers();
    return this.chatUsers().filter(u => {
      const fullName = (u.prenom + ' ' + u.nom).toLowerCase();
      return fullName.includes(q);
    });
  });

  chatGroups = computed(() => this.chatGroupService.groups());
  filteredChatGroups = computed(() => {
    const q = this.miniChatSearch().toLowerCase();
    if (!q) return this.chatGroups();
    return this.chatGroups().filter((g: ChatGroupDto) => g.name?.toLowerCase().includes(q));
  });

  mentionSuggestions = computed(() => {
    const q = this.mentionQuery().toLowerCase();
    const activeGroupId = this.activeMiniChatGroupId();
    if (!activeGroupId || !q) return [];
    const grp = this.chatGroupService.groups().find(g => g.id === activeGroupId);
    if (!grp) return [];
    return grp.members.filter((m: any) =>
      m.id !== this.currentUserId() && m.name?.toLowerCase().includes(q)
    );
  });

  miniChatMessages = computed(() => {
    const activeUserId = this.activeMiniChatUserId();
    const activeGroupId = this.activeMiniChatGroupId();
    
    if (activeGroupId) {
      return this.messageService.messages().filter(m => m.chatGroupId === activeGroupId);
    } else if (activeUserId) {
      return this.messageService.messages().filter(m => !m.chatGroupId && (m.senderId === activeUserId || m.receiverId === activeUserId));
    }
    return [];
  });

  miniChatTitle = computed(() => {
    const activeUserId = this.activeMiniChatUserId();
    if (activeUserId) {
      const user = this.userService.users().find(u => u.id === activeUserId);
      if (!user) return `User ${activeUserId}`;
      return `${user.prenom} ${user.nom}`.trim() || `User ${activeUserId}`;
    }
    
    const activeGroupId = this.activeMiniChatGroupId();
    if (activeGroupId) {
      const grp = this.chatGroupService.groups().find((g: ChatGroupDto) => g.id === activeGroupId);
      return grp?.name || `Group ${activeGroupId}`;
    }
    return '';
  });

  getUserName(userId: number): string {
    const user = this.userService.users().find(u => u.id === userId);
    if (user) return `${user.prenom} ${user.nom}`.trim() || `User ${userId}`;
    const current = this.authService.getCurrentUser();
    if (current && current.id === userId) return `${current.prenom} ${current.nom}`.trim() || `User ${userId}`;
    return `User ${userId}`;
  }

  getUserInitials(userId: number): string {
    const name = this.getUserName(userId);
    if (!name || name.startsWith('User ')) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getUserImage(userId: number): string | null {
    const user = this.userService.users().find(u => u.id === userId);
    let imageUrl = null;
    if (user && user.image) {
      imageUrl = user.image;
    } else {
      const current = this.authService.getCurrentUser();
      if (current && current.id === userId && current.image) {
        imageUrl = current.image;
      }
    }

    if (imageUrl && imageUrl.startsWith('/uploads/')) {
      return 'http://localhost:8080' + imageUrl;
    }
    return imageUrl;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.emoji-picker-container') && !target.closest('.btn-emoji-toggle')) {
      this.showEmojiPicker.set(false);
    }
  }

  get lastMessageContent(): string {
    return this.replyingTo?.content || '';
  }

  constructor() {
    // Mini-chat WebSocket effect
    effect(() => {
      const newMsg = this.webSocketService.realtimeMessage() as any;
      if (newMsg) {
        untracked(() => {
          if (newMsg.content === '__DELETED__') {
            this.messageService.messages.update((msgs: any[]) => msgs.filter((m: any) => m.id !== newMsg.id));
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

          const activeDm = this.activeMiniChatUserId();
          const activeGrp = this.activeMiniChatGroupId();
          const uid = this.currentUserId();
          
          // --- AUTO-OPEN LOGIC (Facebook Style) ---
          if (newMsg.senderId !== uid) {
            const isOnMessenger = this.router.url.includes('/collaboration/messenger');
            if (!isOnMessenger) {
              this.isMiniChatOpen.set(true);
            }
            
            if (newMsg.chatGroupId) {
              if (activeGrp !== newMsg.chatGroupId) {
                this.openMiniChatGroup(newMsg.chatGroupId);
              }
            } else if (newMsg.receiverId === uid) {
              if (activeDm !== newMsg.senderId) {
                this.openMiniChatConversation(newMsg.senderId);
              }
            }
          }
          // ------------------------------------------

          let shouldAdd = false;
          if (this.activeMiniChatGroupId() && newMsg.chatGroupId === this.activeMiniChatGroupId()) {
            shouldAdd = true;
          } else if (this.activeMiniChatUserId() && !newMsg.chatGroupId && 
             ((newMsg.senderId === uid && newMsg.receiverId === this.activeMiniChatUserId()) ||
              (newMsg.senderId === this.activeMiniChatUserId() && newMsg.receiverId === uid))) {
            shouldAdd = true;
          }
          
          if (shouldAdd) {
             const exists = this.messageService.messages().some(m => m.id === newMsg.id);
             if (!exists) {
               this.messageService.messages.update(msgs => [newMsg, ...msgs]);
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
      .subscribe(msgs => {
        // Ensure the triggering message isn't lost if fetch happens too fast
        const realtime = this.webSocketService.realtimeMessage() as any;
        if (realtime && !realtime.chatGroupId && (realtime.senderId === userId || realtime.receiverId === userId)) {
          if (!msgs.some(m => m.id === realtime.id)) {
            msgs = [realtime, ...msgs];
          }
        }
        this.messageService.messages.set(msgs);
      });
  }

  openMiniChatGroup(groupId: string) {
    this.activeMiniChatUserId.set(null);
    this.activeMiniChatGroupId.set(groupId);
    this.messageService.fetchMessagesByGroupSync(groupId).subscribe(msgs => {
       const realtime = this.webSocketService.realtimeMessage() as any;
       if (realtime && realtime.chatGroupId === groupId) {
         if (!msgs.some(m => m.id === realtime.id)) {
           msgs = [realtime, ...msgs];
         }
       }
       this.messageService.messages.set(msgs);
    });
  }

  closeMiniChatConversation() {
    this.activeMiniChatUserId.set(null);
    this.activeMiniChatGroupId.set(null);
    this.miniChatInput = '';
    this.messageService.messages.set([]);
    this.cancelReply();
    this.isPollMode.set(false);
  }

  onChatInput(value: string) {
    this.miniChatInput = value;
    if (this.activeMiniChatGroupId()) {
      const lastWord = value.split(/\s/).pop() || '';
      if (lastWord.startsWith('@') && lastWord.length > 1) {
        this.mentionQuery.set(lastWord.slice(1));
        this.showMentionDropdown.set(true);
      } else {
        this.showMentionDropdown.set(false);
        this.mentionQuery.set('');
      }
    }
  }

  insertMention(member: any) {
    const words = this.miniChatInput.split(/\s/);
    words[words.length - 1] = '@' + member.name + ' ';
    this.miniChatInput = words.join(' ');
    this.showMentionDropdown.set(false);
    this.mentionQuery.set('');
  }

  toggleEmojiPicker() {
    this.showEmojiPicker.set(!this.showEmojiPicker());
  }

  addEmoji(emoji: string) {
    this.miniChatInput += emoji;
  }

  onMessageFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.selectedMessageFile = file;
  }

  togglePollMode() {
    this.isPollMode.update(v => !v);
    if (!this.isPollMode()) {
      this.pollQuestion = '';
      this.pollOptions.set(['', '']);
    }
  }

  addPollOption() {
    if (this.pollOptions().length < 6) this.pollOptions.update(opts => [...opts, '']);
  }

  removePollOption(index: number) {
    if (this.pollOptions().length > 2) this.pollOptions.update(opts => opts.filter((_, i) => i !== index));
  }

  submitPoll() {
    const activeGroupId = this.activeMiniChatGroupId();
    if (!activeGroupId) return;
    const validOptions = this.pollOptions().filter(o => !!o.trim());
    if (!this.pollQuestion.trim() || validOptions.length < 2) return;

    this.messageService.createMessage({
      content: '[Poll]',
      chatGroupId: activeGroupId,
      senderId: this.currentUserId(),
      type: 'POLL',
      pollQuestion: this.pollQuestion,
      pollOptions: validOptions
    }).subscribe(() => {
      this.pollQuestion = '';
      this.pollOptions.set(['', '']);
      this.isPollMode.set(false);
      this.messageService.fetchMessagesByGroup(activeGroupId);
    });
  }

  vote(messageId: string, optionId: string) {
    this.messageService.voteOnPoll(messageId, this.currentUserId(), optionId).subscribe();
  }

  togglePin(msg: MessageDto) {
    this.messageService.togglePin(msg.id).subscribe();
  }

  setReply(msg: MessageDto) {
    this.replyingTo = msg;
  }

  cancelReply() {
    this.replyingTo = null;
  }

  sendMiniChatMessage() {
    if (this.isPollMode()) {
      this.submitPoll();
      return;
    }
    const activeUserId = this.activeMiniChatUserId();
    const activeGroupId = this.activeMiniChatGroupId();
    if (!this.miniChatInput.trim() && !this.selectedMessageFile) return;
    
    this.messageService.createMessage({
      content: this.miniChatInput,
      senderId: this.currentUserId(),
      receiverId: activeUserId || undefined,
      chatGroupId: activeGroupId || undefined,
      parentMessageId: this.replyingTo?.id,
      type: 'TEXT'
    }, this.selectedMessageFile || undefined).subscribe(() => {
      this.miniChatInput = '';
      this.selectedMessageFile = null;
      this.cancelReply();
      if (activeGroupId) {
        this.messageService.fetchMessagesByGroup(activeGroupId);
      } else if (activeUserId) {
        this.messageService.fetchDirectMessages(this.currentUserId(), activeUserId)
          .subscribe(msgs => this.messageService.messages.set(msgs));
      }
    });
  }

  medicationReminderAnswered(messageId: string | undefined): boolean {
    if (messageId == null) return true;
    return this.medicationReminderAnsweredIds().has(messageId);
  }

  answerMedicationReminder(messageId: string, tookMedication: boolean) {
    this.medReminderAckLoading.set(true);
    const content = tookMedication ? 'Yes, I took it.' : 'Not yet.';
    this.messageService.createMessage({
      content,
      senderId: this.currentUserId(),
      type: 'BOT_MESSAGE',
    }).subscribe({
      next: () => {
        this.medicationReminderAnsweredIds.update((s) => new Set(s).add(messageId));
        this.careBotApi.submitMedicationResponse(this.currentUserId(), tookMedication).subscribe({
          next: () => this.medReminderAckLoading.set(false),
          error: () => this.medReminderAckLoading.set(false)
        });
      },
      error: () => this.medReminderAckLoading.set(false)
    });
  }

  openInMessenger() {
    const gid = this.activeMiniChatGroupId();
    const uid = this.activeMiniChatUserId();
    
    if (gid) {
      const grp = this.chatGroupService.groups().find(g => g.id === gid);
      if (grp) this.chatGroupService.activeGroup.set(grp);
      this.router.navigate(['/collaboration/messenger']);
    } else if (uid) {
      // In full messenger, there's no direct route param for DM yet, 
      // but we can set up the service if MessengerComponent respects it.
      this.router.navigate(['/collaboration/messenger'], { queryParams: { dm: uid } });
    } else {
      this.router.navigate(['/collaboration/messenger']);
    }
    this.isMiniChatOpen.set(false);
  }

  getSentimentIcon(score: number | undefined): string {
    if (score === undefined) return '';
    if (score > 0.3) return 'fa-face-smile text-success';
    if (score < -0.3) return 'fa-face-frown text-danger';
    return 'fa-face-meh text-warning';
  }

  formatMessage(content: string | undefined): SafeHtml {
    if (!content) return '';
    let escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const mentionRegex = /@([a-zA-Z0-9À-ÿ._-]+(?:\s[a-zA-Z0-9À-ÿ._-]+)*)/g;
    const activeGroupId = this.activeMiniChatGroupId();
    const formatted = escaped.replace(mentionRegex, (match, fullName) => {
      if (!activeGroupId) return match;
      const grp = this.chatGroupService.groups().find(g => g.id === activeGroupId);
      if (!grp) return match;
      let words = fullName.split(/\s+/);
      while (words.length > 0) {
        let candidate = words.join(' ');
        let member = grp.members.find(m => m.name?.toLowerCase() === candidate.toLowerCase());
        if (member) {
          const remainingWords = fullName.slice(candidate.length);
          return `<span class="mention-tag">@${member.name}</span>${remainingWords}`;
        }
        words.pop();
      }
      return match;
    });
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }
}
