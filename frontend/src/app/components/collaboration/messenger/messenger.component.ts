import { Component, inject, OnInit, OnDestroy, DestroyRef, signal, effect, untracked, PLATFORM_ID, computed, SecurityContext, HostListener } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { PublicationDto } from '../../../services/collaboration/publication.service';
import { MessageService, MessageDto } from '../../../services/collaboration/message.service';
import { ChatGroupService, ChatGroupDto, MemberDto } from '../../../services/collaboration/chat-group.service';
import { AlzUserService } from '../../../services/alz-user.service';
import { WebSocketService } from '../../../services/collaboration/websocket.service';
import { NotificationService } from '../../../services/collaboration/notification.service';
import { MiniChatWidgetComponent } from '../mini-chat-widget/mini-chat-widget.component';
import { CareRelayService, HandoverDTO } from '../../../services/collaboration/care-relay.service';
import { AuthService } from '../../../services/auth.service';
import { CareBotService } from '../../../services/collaboration/care-bot.service';
import { VideoCallComponent } from '../../videocall/videocall.component';
import { VideoCallService } from '../../../services/videocall.service';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-messenger',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MiniChatWidgetComponent, VideoCallComponent],
  templateUrl: './messenger.component.html',
  styleUrls: ['./messenger.component.scss']
})
export class MessengerComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  videoCallService = inject(VideoCallService);
  messageService = inject(MessageService);
  chatGroupService = inject(ChatGroupService);
  userService = inject(AlzUserService);
  webSocketService = inject(WebSocketService);
  sanitizer = inject(DomSanitizer);
  notificationService = inject(NotificationService);
  careRelayService = inject(CareRelayService);
  platformId = inject(PLATFORM_ID);
  route = inject(ActivatedRoute);
  router = inject(Router);
  careBotApi = inject(CareBotService);
  private destroyRef = inject(DestroyRef);

  currentUserId = signal<number>(this.authService.getCurrentUser()?.id || 1);
  medReminderLoading = signal(false);
  /** Hide Yes/No after the user answered (session only; reload may show again). */
  medicationReminderAnsweredIds = signal<Set<number>>(new Set());
  medReminderAckLoading = signal<boolean>(false);

  // AI Handover State
  currentSummary = signal<string | null>(null);
  isGeneratingSummary = signal<boolean>(false);

  openMedia(url: string | undefined) {
    if (url) window.open(url, '_blank');
  }

  navigateToPost(pubId: number) {
    this.router.navigate(['/collaboration/feed'], { fragment: 'pub-' + pubId });
  }

  getVotePercentage(msg: MessageDto, option: any): number {
    if (!msg.pollOptions || msg.pollOptions.length === 0) return 0;
    const totalVotes = msg.pollOptions.reduce((sum, opt) => sum + (opt.votes || 0), 0);
    if (totalVotes === 0) return 0;
    return Math.round(((option.votes || 0) / totalVotes) * 100);
  }

  userIdNum(id: any): number {
    return Number(id);
  }

  getUserName(userId: number): string {
    // 1. Try to find in the fetched users list
    const user = this.userService.users().find(u => u.id === userId);
    if (user) {
      const fullName = [user.prenom, user.nom].filter(Boolean).join(' ');
      return fullName || 'User ' + userId;
    }

    // 2. Fallback: If it's the current user, use AuthService data
    const current = this.authService.getCurrentUser();
    if (current && current.id === userId) {
      const fullName = [current.prenom, current.nom].filter(Boolean).join(' ');
      return fullName || 'User ' + userId;
    }

    // 3. Last resort fallback
    return 'User ' + userId;
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
  activeChatType = signal<'GROUP' | 'DM' | 'BOT'>('GROUP');
  activeDmUserId = signal<number | null>(null);
  /** Incoming ring handled by AppComponent/VideoCallService. */
  private videoListenRoomId = '';
  showInfoSidebar = signal<boolean>(false);

  /** Video call available for group chat or 1:1 DM (not CareBot thread). */
  canStartVideoCall = computed(() => {
    const t = this.activeChatType();
    if (t === 'BOT') return false;
    if (t === 'GROUP') return !!this.activeGroup()?.id;
    if (t === 'DM') return this.activeDmUserId() != null;
    return false;
  });
  showHandoverPanel = signal<boolean>(false);
  handoverData = computed(() => this.careRelayService.handover());
  notifications = computed(() => this.notificationService.notifications());
  unreadCount = computed(() => this.notificationService.unreadCount());
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
    return users.filter((u: any) => {
      if (u.id === uid) return false;
      if (!q) return true;
      const fullName = `${u.prenom || ''} ${u.nom || ''}`.toLowerCase();
      return fullName.includes(q) || (u.id?.toString() || '').includes(q);
    });
  });

  filteredMessages = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const chat = this.activeChatType();
    const msgs =
      chat === 'GROUP'
        ? this.messageService.messages()
        : chat === 'BOT'
          ? this.botMessages()
          : this.dmMessages();
    if (chat === 'BOT') {
      const src = !q ? [...msgs] : msgs.filter((m: any) => m.content?.toLowerCase().includes(q));
      return src.sort(
        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
      );
    }
    if (!q) return [...msgs].reverse();
    return msgs.filter((m: any) => m.content?.toLowerCase().includes(q)).reverse();
  });

  pinnedMessages = computed(() => {
    return this.filteredMessages().filter(m => m.isPinned || m.pinned);
  });

  sharedMedia = computed(() => {
    return this.filteredMessages().filter(m => !!m.mediaUrl);
  });

  dmMessages = signal<MessageDto[]>([]);
  /** CareBot thread; separate from group/DM so WS updates do not mix into group lists */
  botMessages = signal<MessageDto[]>([]);

  constructor() {
    effect(() => {
      const newMsg = this.webSocketService.realtimeMessage() as any;
      if (newMsg) {
        untracked(() => {
          if (newMsg.content === '__DELETED__') {
            this.messageService.messages.update((msgs: any[]) => msgs.filter((m: any) => m.id !== newMsg.id));
            this.dmMessages.update((msgs: any[]) => msgs.filter((m: any) => m.id !== newMsg.id));
            this.botMessages.update((msgs: any[]) => msgs.filter((m: any) => m.id !== newMsg.id));
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

          const indexBot = this.botMessages().findIndex(m => m.id === newMsg.id);
          if (indexBot !== -1) {
            this.botMessages.update(msgs => {
              const copy = [...msgs];
              copy[indexBot] = newMsg;
              return copy;
            });
            return;
          }

          const uid = this.currentUserId();
          const isBotPipe =
            newMsg.type === 'BOT_MESSAGE' ||
            newMsg.type === 'MEDICATION_REMINDER' ||
            newMsg.fromBot === true;

          // CareBot replies: receiver set, sender null — must not use "otherUserId" DM logic
          if (
            isBotPipe &&
            (newMsg.receiverId === uid || newMsg.senderId === uid)
          ) {
            this.botMessages.update(msgs => {
              if (msgs.some(m => m.id === newMsg.id)) return msgs;
              return [newMsg, ...msgs];
            });
            return;
          }

          if (newMsg.chatGroupId && this.activeGroup()?.id === newMsg.chatGroupId) {
            this.messageService.messages.update(msgs => [newMsg, ...msgs]);
          } else if (newMsg.receiverId === uid || newMsg.senderId === uid) {
            const otherUserId =
              newMsg.senderId === uid ? newMsg.receiverId : newMsg.senderId;
            if (otherUserId != null && this.activeDmUserId() === otherUserId) {
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

    effect(() => {
      const uid = this.currentUserId();
      const chatType = this.activeChatType();
      const group = this.activeGroup();
      const dmOther = this.activeDmUserId();
      if (!isPlatformBrowser(this.platformId)) return;
      untracked(() => {
        let roomId = '';
        if (chatType === 'GROUP' && group?.id != null) {
          roomId = `collab-group-${group.id}`;
        } else if (chatType === 'DM' && dmOther != null) {
          const a = Math.min(uid, dmOther);
          const b = Math.max(uid, dmOther);
          roomId = `collab-dm-${a}-${b}`;
        }
        const prev = this.videoListenRoomId;
        if (prev && prev !== roomId) {
          this.videoCallService.unsubscribeFromRoom(prev);
        }
        this.videoListenRoomId = roomId;
        // Always connect video STOMP so /user/queue/videocall (DM ring) works even if no chat is selected.
        this.videoCallService.connect(String(uid));
        if (roomId) {
          this.videoCallService.ensureSubscribedToRoom(roomId);
        }
      });
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.refreshData();
      this.route.queryParams.subscribe(params => {
        if (params['dm']) {
          this.openDmChat(Number(params['dm']));
        } else if (params['group']) {
          const gid = Number(params['group']);
          const grp = this.chatGroupService.groups().find(g => g.id === gid);
          if (grp) {
            this.enterGroup(grp);
          } else {
            this.chatGroupService.getGroupById(gid).subscribe(g => this.enterGroup(g));
          }
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.videoListenRoomId) {
      this.videoCallService.unsubscribeFromRoom(this.videoListenRoomId);
    }
  }

  refreshData() {
    this.chatGroupService.fetchGroups();
    this.userService.fetchUsers();
    this.notificationService.fetchNotifications(this.currentUserId());
  }

  // --- EMOJI PICKER LOGIC ---
  showEmojiPicker = signal<boolean>(false);
  
  readonly EMOJI_LIST = [
    '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😻','😼','😽','🙀','😿','😾',
    '👋','🤚','🖐','✋','🖖','👌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦿','🦶','👣','👂','🦻','👃','🧠','🦷','🦴','👀','👁','👅','👄',
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉','☸️','✡️','🔯',
    '🔥','✨','⭐','🌟','☁️','☀️','🌈','☘️','🍀','🌸','🌹','🌻','🌱','🌿','🍃','🍂','🍁','🍄','🌾','🌵','🌴','🌳','🌲'
  ];

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.emoji-picker-container') && !target.closest('.btn-emoji-toggle')) {
      this.showEmojiPicker.set(false);
    }
  }

  toggleEmojiPicker() {
    this.showEmojiPicker.set(!this.showEmojiPicker());
  }

  addEmojiToMessage(emoji: string) {
    if (this.activeChatType() === 'GROUP') {
      this.newGroupMessage += emoji;
    } else {
      this.dmContent += emoji;
    }
  }
  // --- END EMOJI LOGIC ---

  enterGroup(grp: ChatGroupDto) {
    this.searchQuery.set('');
    this.activeChatType.set('GROUP');
    this.activeDmUserId.set(null);
    this.chatGroupService.activeGroup.set(grp);
    this.messageService.fetchMessagesByGroup(grp.id!);
    this.webSocketService.subscribeToGroup(grp.id!);
    this.currentSummary.set(null);
  }

  openDmChat(userId: number) {
    this.searchQuery.set('');
    this.activeChatType.set('DM');
    this.activeDmUserId.set(userId);
    this.chatGroupService.activeGroup.set(null);
    this.messageService.fetchDirectMessages(this.currentUserId(), userId).subscribe(msgs => {
      this.dmMessages.set(msgs);
    });
    this.currentSummary.set(null);
  }

  fetchHandoverSummary() {
    this.showInfoSidebar.set(true);
    if (!this.showHandoverPanel()) {
      this.toggleHandoverPanel();
    } else {
      const grp = this.activeGroup();
      if (grp) this.careRelayService.loadHandover(grp.id!);
    }
  }

  openBotChat() {
    this.activeChatType.set('BOT');
    this.activeDmUserId.set(null);
    this.chatGroupService.activeGroup.set(null);
    this.messageService.fetchBotMessages(this.currentUserId()).subscribe(data => {
      this.botMessages.set(data);
    });
  }

  private computeMessengerVideoRoomId(): string {
    const me = this.currentUserId();
    if (this.activeChatType() === 'GROUP') {
      const gid = this.activeGroup()?.id;
      if (gid == null) return '';
      return `collab-group-${gid}`;
    }
    if (this.activeChatType() === 'DM') {
      const other = this.activeDmUserId();
      if (other == null) return '';
      const a = Math.min(me, other);
      const b = Math.max(me, other);
      return `collab-dm-${a}-${b}`;
    }
    return '';
  }

  openMessengerVideoCall(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const me = this.currentUserId();
    const roomId = this.computeMessengerVideoRoomId();
    if (!roomId) return;

    this.videoCallService.connect(String(me));
    this.videoCallService.ensureSubscribedToRoom(roomId);

    const sendInvite = () => {
      const u = this.authService.getCurrentUser();
      const callerName =
        [u?.prenom, u?.nom].filter(Boolean).join(' ') ||
        (u as any)?.username ||
        u?.email ||
        'Someone';
      const invite: {
        type: string;
        senderId: string;
        data: { roomId: string; callerName: string };
        recipientId?: string;
      } = {
        type: 'messenger-invite',
        senderId: String(me),
        data: { roomId, callerName },
      };
      if (this.activeChatType() === 'DM' && this.activeDmUserId() != null) {
        invite.recipientId = String(this.activeDmUserId());
      }
      this.videoCallService.sendSignal(roomId, invite);
    };

    if (this.videoCallService.isConnected$.value) {
      sendInvite();
      this.videoCallService.openCall(roomId);
    } else {
      this.videoCallService.isConnected$
        .pipe(filter((c) => c), take(1), takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          sendInvite();
          this.videoCallService.openCall(roomId);
        });
    }
  }

  closeMessengerVideoCall(): void {
    this.videoCallService.closeCallOverlay();
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
    const trimmed = this.dmContent.trim();
    if (!trimmed || !this.activeDmUserId()) return;
    
    this.messageService.createMessage({
      content: trimmed,
      senderId: this.currentUserId(),
      receiverId: this.activeDmUserId()!,
      type: 'TEXT'
    }).subscribe(() => {
      this.dmContent = '';
      this.refreshData();
    });
  }

  sendBotMessage() {
    if (!this.dmContent.trim()) return;
    const content = this.dmContent;
    this.dmContent = '';
    
    // 1. Create a local temporary message for UI
    const tempMsg: MessageDto = {
      id: Date.now(),
      content: content,
      senderId: this.currentUserId(),
      senderName: 'You',
      sentAt: new Date().toISOString(),
      type: 'TEXT'
    };
    this.botMessages.update(prev => [tempMsg, ...prev]);

    // 2. Send to backend (CareBot will intercept if disoriented)
    this.messageService.createMessage({
      content: content,
      senderId: this.currentUserId(),
      type: 'BOT_MESSAGE' // Tag it so backend knows it's a bot-destined message
    }).subscribe(() => {
      setTimeout(() => this.openBotChat(), 500);
    });
  }

  /** Same payload as the daily 8:00 AM job; sends only to the logged-in user if they are a PATIENT. */
  triggerMedicationReminderTest() {
    this.medReminderLoading.set(true);
    this.careBotApi.triggerMedicationReminder(this.currentUserId()).subscribe({
      next: () => {
        this.medReminderLoading.set(false);
        this.openBotChat();
      },
      error: (err: { error?: string; message?: string }) => {
        this.medReminderLoading.set(false);
        const msg = typeof err.error === 'string' ? err.error : (err.message || 'Could not send reminder');
        alert(msg);
      }
    });
  }

  medicationReminderAnswered(messageId: number | undefined): boolean {
    if (messageId == null) return true;
    return this.medicationReminderAnsweredIds().has(messageId);
  }

  answerMedicationReminder(messageId: number, tookMedication: boolean) {
    this.medReminderAckLoading.set(true);
    const content = tookMedication ? 'Yes, I took it.' : 'Not yet.';
    this.messageService
      .createMessage({
        content,
        senderId: this.currentUserId(),
        type: 'BOT_MESSAGE',
      })
      .subscribe({
        next: () => {
          this.medicationReminderAnsweredIds.update((s) => new Set(s).add(messageId));
          this.careBotApi.submitMedicationResponse(this.currentUserId(), tookMedication).subscribe({
            next: () => {
              this.medReminderAckLoading.set(false);
            },
            error: (err: { error?: string; message?: string }) => {
              this.medReminderAckLoading.set(false);
              const msg =
                typeof err.error === 'string'
                  ? err.error
                  : err.message || 'CareBot could not send a reply.';
              alert(msg);
            },
          });
        },
        error: (err: { error?: string; message?: string }) => {
          this.medReminderAckLoading.set(false);
          const msg =
            typeof err.error === 'string' ? err.error : err.message || 'Could not send your answer.';
          alert(msg);
        },
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
    if (!user) return 'User ' + this.activeDmUserId();
    const fullName = [user.prenom, user.nom].filter(Boolean).join(' ');
    return fullName || 'User ' + user.id;
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
