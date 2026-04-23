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
import { GuidanceService } from '../../../services/collaboration/guidance.service';
import { SpeechToTextService } from '../../../services/collaboration/speech-to-text.service';
import { SpeakOnHoverDirective } from '../../../directives/speak-on-hover.directive';
import { VoiceWelcomeComponent } from '../voice-welcome/voice-welcome.component';
import { VoiceConversationComponent } from '../voice-conversation/voice-conversation.component';
import { VoiceConversationService } from '../../../services/collaboration/voice-conversation.service';
import { FloatingAssistantComponent } from '../floating-assistant/floating-assistant.component';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-messenger',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MiniChatWidgetComponent, VideoCallComponent, VoiceWelcomeComponent, SpeakOnHoverDirective, VoiceConversationComponent, FloatingAssistantComponent],
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
  guidanceService = inject(GuidanceService);
  sttService = inject(SpeechToTextService);
  convService = inject(VoiceConversationService);
  private destroyRef = inject(DestroyRef);

  currentUserId = signal<number>(this.authService.getCurrentUser()?.id || 1);
  medReminderLoading = signal(false);
  /** Hide Yes/No after the user answered (session only; reload may show again). */
  medicationReminderAnsweredIds = signal<Set<string>>(new Set());
  medReminderAckLoading = signal<boolean>(false);
  
  chattedUserIds = signal<number[]>([]);
  isAddingContact = signal<boolean>(false);

  currentSummary = signal<string | null>(null);
  isGeneratingSummary = signal<boolean>(false);

  openMedia(url: string | undefined) {
    if (url) window.open(url, '_blank');
  }

  navigateToPost(pubId: string) {
    this.router.navigate(['/collaboration/feed']).then(() => {
      setTimeout(() => {
        const element = document.getElementById('pub-' + pubId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-post');
          setTimeout(() => element.classList.remove('highlight-post'), 2000);
        }
      }, 300);
    });
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
    const user = this.userService.users().find(u => u.id === userId);
    if (user) {
      const fullName = [user.prenom, user.nom].filter(Boolean).join(' ');
      return fullName || 'User ' + userId;
    }

    const current = this.authService.getCurrentUser();
    if (current && current.id === userId) {
      const fullName = [current.prenom, current.nom].filter(Boolean).join(' ');
      return fullName || 'User ' + userId;
    }

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
  selectedMessageFiles: File[] = [];
  searchQuery = signal<string>('');
  replyingTo: MessageDto | null = null;

  editingMessageId: string | null = null;
  editingMessageContent = '';

  isPollMode = signal<boolean>(false);
  pollQuestion = '';
  pollOptions = signal<string[]>(['', '']);

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
    const allUsers = this.userService.users();
    const uid = this.currentUserId();
    const q = this.dmUserSearch().toLowerCase();
    const historyIds = this.chattedUserIds();
    const addingNew = this.isAddingContact();

    let targetUsers = [];

    if (!addingNew) {
      targetUsers = allUsers.filter(u => historyIds.includes(Number(u.id)));
    } else {
      const myGroupMemberIds = new Set<number>();
      this.groups().forEach(g => g.members.forEach(m => myGroupMemberIds.add(Number(m.id))));
      
      targetUsers = allUsers.filter(u => 
        u.id !== uid && 
        myGroupMemberIds.has(Number(u.id)) && 
        !historyIds.includes(Number(u.id))
      );
    }

    if (!q) return targetUsers;
    return targetUsers.filter((u: any) => {
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
            this.messageService.messages.update(msgs => {
              if (msgs.some(m => m.id === newMsg.id)) return msgs;
              return [newMsg, ...msgs];
            });
          } else if (newMsg.receiverId === uid || newMsg.senderId === uid) {
            const otherUserId =
              newMsg.senderId === uid ? newMsg.receiverId : newMsg.senderId;
            
            if (otherUserId != null) {
              if (!this.chattedUserIds().includes(otherUserId)) {
                this.chattedUserIds.update(ids => [...ids, otherUserId]);
              }

              if (this.activeDmUserId() === otherUserId) {
                this.dmMessages.update(msgs => {
                  if (msgs.some(m => m.id === newMsg.id)) return msgs;
                  return [newMsg, ...msgs];
                });
              }
            }
          }

          if (newMsg.senderId !== uid && !isBotPipe) {
            const senderName = this.getUserName(newMsg.senderId) || 'Someone';
            const content = newMsg.content || 'sent a message';
            this.guidanceService.speakIncomingMessage(senderName, content);
          }
          if (isBotPipe && newMsg.receiverId === uid) {
            this.guidanceService.speak(newMsg.content || 'CareBot sent you a message.');
            if (newMsg.type === 'MEDICATION_REMINDER') {
              setTimeout(() => {
                this.convService.ask({
                  question: newMsg.content || 'Did you take your medication today?',
                  actions: [
                    {
                      label: 'Yes, I took it',
                      keyword: ['yes', 'took', 'done', 'taken', 'did'],
                      callback: () => this.answerMedicationReminder(newMsg.id!, true)
                    },
                    {
                      label: 'Not yet',
                      keyword: ['no', 'not', 'yet', 'later', 'forgot'],
                      callback: () => this.answerMedicationReminder(newMsg.id!, false)
                    }
                  ],
                  timeoutMs: 30000
                });
              }, 2500);
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
      const evt = this.webSocketService.typingEvent();
      if (evt && evt.senderId !== this.currentUserId()) {
        untracked(() => {
          if (evt.groupId && evt.groupId !== this.activeGroup()?.id) return;

          const map = new Map(this.typingUsers());
          if (evt.typing) {
            const existing = map.get(evt.senderId);
            if (existing) clearTimeout(existing as any);
            const t = setTimeout(() => {
              this.typingUsers.update(m => { const n = new Map(m); n.delete(evt.senderId); return n; });
            }, 3000);
            map.set(evt.senderId, t as any);
          } else {
            const existing = map.get(evt.senderId);
            if (existing) clearTimeout(existing as any);
            map.delete(evt.senderId);
          }
          this.typingUsers.set(map);
        });
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const notif = this.webSocketService.notificationMessage();
      if (notif) {
        untracked(() => {
          this.notificationService.addNotification(notif);
          this.guidanceService.speakNotification(notif.content, notif.type);

          if (notif.type === 'CAREBOT' || notif.type === 'VOICE_PROMPT' || notif.type === 'MEDICATION_REMINDER') {
            setTimeout(() => {
              this.convService.ask({
                question: notif.content,
                actions: [
                  {
                    label: 'Okay',
                    keyword: ['okay', 'ok', 'yes', 'understood', 'thanks'],
                    callback: () => this.guidanceService.speakImmediate('Good. I am here if you need me.')
                  },
                  {
                    label: 'Read again',
                    keyword: ['again', 'repeat', 'what', 'pardon'],
                    callback: () => this.guidanceService.speakImmediate(notif.content)
                  }
                ],
                timeoutMs: 20000
              });
            }, 2000);
          }
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
      this.guidanceService.loadAndSpeak('messenger');
      this.route.queryParams.subscribe(params => {
        if (params['dm']) {
          this.openDmChat(Number(params['dm']));
        } else if (params['group']) {
          const gid = params['group'] as string;
          const grp = this.chatGroupService.groups().find(g => g.id === gid);
          if (grp) {
            this.enterGroup(grp);
          } else {
            this.chatGroupService.getGroupById(gid).subscribe(g => this.enterGroup(g));
          }
        } else if (params['sendTo']) {
          const contactName: string = (params['sendTo'] as string).toLowerCase().trim();
          const prefilledText: string = params['text'] ?? '';

          const findAndOpen = () => {
            const users = this.userService.users();
            const match = users.find(u => {
              const fullName = `${u.prenom ?? ''} ${u.nom ?? ''}`.toLowerCase().trim();
              const firstName = (u.prenom ?? '').toLowerCase().trim();
              return fullName.includes(contactName) || firstName === contactName;
            });
            if (match?.id) {
              this.openDmChat(match.id);
              if (prefilledText) {
                setTimeout(() => { this.dmContent = prefilledText; }, 300);
              }
            } else {
              this.guidanceService.speakImmediate(
                `I could not find ${params['sendTo']} in your contacts. Please check your messages.`
              );
            }
          };

          if (this.userService.users().length > 0) {
            findAndOpen();
          } else {
            setTimeout(findAndOpen, 800);
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

  /**
   * After a conversation is opened, asks the user what they want to say
   * and sends it automatically if they speak.
   * Only triggers if voice is unlocked and STT is supported.
   */
  refreshData() {
    this.chatGroupService.fetchGroups();
    this.userService.fetchUsers();
    
    const uid = this.currentUserId();
    if (uid) {
      this.notificationService.fetchNotifications(uid);
      this.fetchChattedPeers();
    }
  }

  fetchChattedPeers() {
    this.messageService.fetchDirectMessagePeers(this.currentUserId()).subscribe(ids => {
      this.chattedUserIds.set(ids);
    });
  }

  /**
   * Standalone voice-send: listens once and sends whatever the user says
   * into the currently active conversation.
   */
  startVoiceSend() {
    if (!this.sttService.isSupported) return;
    const chatType = this.activeChatType();
    const groupId = this.activeGroup()?.id;

    this.sttService.askAndListen('Say your message now.').then(transcript => {
      if (!transcript.trim() || transcript.toLowerCase() === 'cancel') {
        this.guidanceService.speakImmediate('Cancelled.');
        return;
      }
      if (chatType === 'GROUP' && groupId) {
        this.newGroupMessage = transcript;
        this.sendGroupMessage(groupId);
        this.guidanceService.speakImmediate('Message sent.');
      } else if (chatType === 'DM') {
        this.dmContent = transcript;
        this.sendDmMessage();
        this.guidanceService.speakImmediate('Message sent.');
      }
    }).catch(() => {
      this.guidanceService.speakImmediate('Could not hear you. Please try again.');
    });
  }

  /**
   * Voice command flow for the messenger.
   * Asks "Who do you want to message?" then opens the matching group or DM.
   */
  startVoiceNavigation() {
    const groupNames = this.groups().map(g => g.name);
    const peopleNames = this.userService.users()
      .filter(u => u.id !== this.currentUserId())
      .map(u => `${u.prenom || ''} ${u.nom || ''}`.trim());

    this.sttService.askAndListen(
      'This is your messenger. Say the name of a group or a person you want to message.'
    ).then(transcript => {
      const cmd = this.sttService.parseCommand(transcript, groupNames, peopleNames);
      switch (cmd.type) {
        case 'OPEN_GROUP': {
          const grp = this.groups().find(g =>
            g.name.toLowerCase() === cmd.groupName.toLowerCase()
          );
          if (grp) {
            this.enterGroup(grp);
            this.guidanceService.speakImmediate(`Opening group ${grp.name}.`);
          } else {
            this.guidanceService.speakImmediate(`Sorry, I could not find a group called ${cmd.groupName}.`);
          }
          break;
        }
        case 'OPEN_DM': {
          const user = this.userService.users().find(u =>
            (`${u.prenom} ${u.nom}`).toLowerCase().includes(cmd.personName.toLowerCase())
          );
          if (user) {
            this.openDmChat(user.id!);
            this.guidanceService.speakImmediate(`Opening conversation with ${user.prenom}.`);
          } else {
            this.guidanceService.speakImmediate(`Sorry, I could not find ${cmd.personName} in your contacts.`);
          }
          break;
        }
        case 'STOP_VOICE':
          this.guidanceService.stopSpeaking();
          break;
        case 'REPEAT':
          this.guidanceService.speakCurrentPage();
          break;
        default:
          this.guidanceService.speakImmediate(
            `I heard: ${transcript}. I did not understand. Please say a group name or a person's name.`
          );
      }
    }).catch(() => {
      this.guidanceService.speakImmediate('Sorry, I could not hear you. Please try again.');
    });
  }

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

  enterGroup(grp: ChatGroupDto) {
    this.searchQuery.set('');
    this.activeChatType.set('GROUP');
    this.activeDmUserId.set(null);
    this.chatGroupService.activeGroup.set(grp);
    this.messagePage = 0;
    this.hasMoreMessages.set(true);
    this.typingUsers.set(new Map());
    this.messageService.fetchMessagesByGroupPaged(grp.id!, 0).subscribe(msgs => {
      this.messageService.messages.set(msgs);
    });
    this.webSocketService.subscribeToGroup(grp.id!);
    this.webSocketService.subscribeToGroupTyping(grp.id!);
    this.currentSummary.set(null);

    if (this.guidanceService.voiceUnlocked()) {
      setTimeout(() => {
        this.convService.ask({
          question: `You opened the group ${grp.name}. Would you like to send a message?`,
          actions: [
            {
              label: 'Yes, speak my message',
              keyword: ['yes', 'sure', 'okay', 'speak', 'message', 'send'],
              callback: () => this.startVoiceSend()
            },
            {
              label: 'No, just browse',
              keyword: ['no', 'browse', 'look', 'read', 'skip'],
              callback: () => this.guidanceService.speakImmediate('Okay, take your time.')
            }
          ]
        });
      }, 800);
    }
  }

  openDmChat(userId: number) {
    this.searchQuery.set('');
    this.activeChatType.set('DM');
    this.activeDmUserId.set(userId);
    this.chatGroupService.activeGroup.set(null);
    this.messageService.fetchDirectMessages(this.currentUserId(), userId).subscribe(msgs => {
      this.dmMessages.set(msgs);
      const me = this.currentUserId();
      msgs.filter(m => m.senderId !== me && !(m.viewedByUserIds?.includes(me)))
          .forEach(m => this.messageService.markAsRead(m.id, me).subscribe());
    });
    this.currentSummary.set(null);

    if (this.guidanceService.voiceUnlocked()) {
      const name = this.getUserName(userId);
      setTimeout(() => {
        this.convService.ask({
          question: `You opened a conversation with ${name}. Would you like to say something?`,
          actions: [
            {
              label: 'Yes, speak my message',
              keyword: ['yes', 'sure', 'okay', 'speak', 'message', 'send'],
              callback: () => this.startVoiceSend()
            },
            {
              label: 'No thanks',
              keyword: ['no', 'skip', 'cancel', 'browse'],
              callback: () => this.guidanceService.speakImmediate('Okay, no problem.')
            }
          ]
        });
      }, 800);
    }
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

  sendGroupMessage(groupId: string) {
    if (this.isPollMode()) {
      this.submitPoll(groupId);
      return;
    }
    if (!this.newGroupMessage.trim() && this.selectedMessageFiles.length === 0) return;
    this.messageService.createMessage({
      content: this.newGroupMessage,
      chatGroupId: groupId,
      senderId: this.currentUserId(),
      parentMessageId: this.replyingTo?.id,
      type: 'TEXT'
    }, this.selectedMessageFiles.length > 0 ? this.selectedMessageFiles : undefined).subscribe((saved) => {
      this.newGroupMessage = '';
      this.selectedMessageFiles = [];
      this.replyingTo = null;
      this.messageService.messages.update(msgs => {
        if (msgs.some(m => m.id === saved.id)) return msgs;
        return [saved, ...msgs];
      });
    });
  }

  submitPoll(groupId: string) {
    const validOptions = this.pollOptions().filter(o => !!o.trim());
    if (!this.pollQuestion.trim() || validOptions.length < 2) return;

    this.messageService.createMessage({
      content: '[Poll]',
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

  vote(messageId: string, optionId: string) {
    this.messageService.voteOnPoll(messageId, this.currentUserId(), optionId).subscribe(updated => {
      const updateList = (msgs: MessageDto[]) =>
        msgs.map(m => m.id === updated.id ? updated : m);
      this.messageService.messages.update(updateList);
      this.dmMessages.update(updateList);
      this.botMessages.update(updateList);
    });
  }

  togglePin(msg: MessageDto) {
    this.messageService.togglePin(msg.id).subscribe(updated => {
      const updateList = (msgs: MessageDto[]) => msgs.map(m => m.id === updated.id ? updated : m);
      this.messageService.messages.update(updateList);
      this.dmMessages.update(updateList);
    });
  }

  deleteMsg(msg: MessageDto) {
    if (!confirm('Delete this message?')) return;
    this.messageService.deleteMessage(msg.id).subscribe();
    const removeMsg = (msgs: MessageDto[]) => msgs.filter(m => m.id !== msg.id);
    this.messageService.messages.update(removeMsg);
    this.dmMessages.update(removeMsg);
    this.botMessages.update(removeMsg);
  }

  startEditMessage(msg: MessageDto) {
    this.editingMessageId = msg.id;
    this.editingMessageContent = msg.content;
  }

  saveEditMessage(msg: MessageDto) {
    if (!this.editingMessageContent.trim()) return;
    const req = {
      content: this.editingMessageContent,
      senderId: this.currentUserId(),
      chatGroupId: msg.chatGroupId,
      receiverId: msg.receiverId
    };
    this.messageService.updateMessage(msg.id, req).subscribe(updated => {
      const updateList = (msgs: MessageDto[]) => msgs.map(m => m.id === updated.id ? updated : m);
      this.messageService.messages.update(updateList);
      this.dmMessages.update(updateList);
      this.cancelEditMessage();
    });
  }

  cancelEditMessage() {
    this.editingMessageId = null;
    this.editingMessageContent = '';
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

  updatePollOption(index: number, value: string) {
    this.pollOptions.update(opts => {
      const copy = [...opts];
      copy[index] = value;
      return copy;
    });
  }

  getTotalVotes(msg: MessageDto): number {
    if (!msg.pollOptions) return 0;
    return msg.pollOptions.reduce((s, o) => s + (o.votes || 0), 0);
  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }

  sendDmMessage() {
    const trimmed = this.dmContent.trim();
    if (!trimmed && this.selectedMessageFiles.length === 0) return;
    if (!this.activeDmUserId()) return;
    this.messageService.createMessage({
      content: trimmed || '',
      senderId: this.currentUserId(),
      receiverId: this.activeDmUserId()!,
      parentMessageId: this.replyingTo?.id,
      type: 'TEXT'
    }, this.selectedMessageFiles.length > 0 ? this.selectedMessageFiles : undefined).subscribe((saved) => {
      this.dmContent = '';
      this.selectedMessageFiles = [];
      this.replyingTo = null;
      
      this.dmMessages.update(msgs => {
        if (msgs.some(m => m.id === saved.id)) return msgs;
        return [saved, ...msgs];
      });

      const otherId = saved.receiverId!;
      if (!this.chattedUserIds().includes(otherId)) {
        this.chattedUserIds.update(ids => [...ids, otherId]);
      }
    });
  }

  sendBotMessage() {
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

  medicationReminderAnswered(messageId: string | undefined): boolean {
    if (messageId == null) return true;
    return this.medicationReminderAnsweredIds().has(messageId);
  }

  answerMedicationReminder(messageId: string, tookMedication: boolean) {
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
    if (input.files) {
      this.selectedMessageFiles = Array.from(input.files);
    }
  }
  
  removeSelectedMessageFile(index: number) {
    this.selectedMessageFiles.splice(index, 1);
  }

  setReply(msg: MessageDto) {
    this.replyingTo = msg;
  }

  cancelReply() {
    this.replyingTo = null;
  }

  scrollToMessage(messageId: string) {
    const element = document.getElementById('msg-' + messageId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      element.classList.add('highlight-message');
      setTimeout(() => {
        element.classList.remove('highlight-message');
      }, 2000);
    }
  }

  closeChat() {
    this.chatGroupService.activeGroup.set(null);
  }

  leaveGroupAction(groupId: string) {
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

  messagePage = 0;
  hasMoreMessages = signal<boolean>(true);
  isLoadingMoreMessages = signal<boolean>(false);

  loadMoreMessages() {
    const grp = this.activeGroup();
    if (!grp || this.isLoadingMoreMessages() || !this.hasMoreMessages()) return;
    this.isLoadingMoreMessages.set(true);
    this.messagePage++;
    this.messageService.fetchMessagesByGroupPaged(grp.id!, this.messagePage).subscribe({
      next: (older) => {
        if (older.length === 0) {
          this.hasMoreMessages.set(false);
        } else {
          this.messageService.messages.update(msgs => [...msgs, ...older]);
        }
        this.isLoadingMoreMessages.set(false);
      },
      error: () => this.isLoadingMoreMessages.set(false)
    });
  }
  typingUsers = signal<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  isOtherTyping = computed(() => this.typingUsers().size > 0);
  typingLabel = computed(() => {
    const ids = Array.from(this.typingUsers().keys());
    if (ids.length === 0) return '';
    if (ids.length === 1) return this.getUserName(ids[0]) + ' is typing...';
    return ids.length + ' people are typing...';
  });

  private typingTimeout: any;

  onInputChange(value: string, isGroup: boolean) {
    if (isGroup) {
      this.newGroupMessage = value;
      const lastWord = value.split(/\s/).pop() || '';
      if (lastWord.startsWith('@') && lastWord.length > 1) {
        this.mentionQuery.set(lastWord.slice(1));
        this.showMentionDropdown.set(true);
      } else {
        this.showMentionDropdown.set(false);
        this.mentionQuery.set('');
      }
      const gid = this.activeGroup()?.id;
      if (gid) this.webSocketService.sendTyping(this.currentUserId(), undefined, gid, true);
    } else {
      this.dmContent = value;
      const otherId = this.activeDmUserId();
      if (otherId) this.webSocketService.sendTyping(this.currentUserId(), otherId, undefined, true);
    }
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      const gid = this.activeGroup()?.id;
      const otherId = this.activeDmUserId();
      if (gid) this.webSocketService.sendTyping(this.currentUserId(), undefined, gid, false);
      if (otherId) this.webSocketService.sendTyping(this.currentUserId(), otherId, undefined, false);
    }, 2000);
  }

  formatMessage(content: string | undefined): SafeHtml {
    if (!content) return '';
    
    let escaped = content.replace(/&/g, '&amp;')
                         .replace(/</g, '&lt;')
                         .replace(/>/g, '&gt;')
                         .replace(/"/g, '&quot;')
                         .replace(/'/g, '&#039;');

    const mentionRegex = /@([a-zA-Z0-9À-ÿ._-]+(?:\s[a-zA-Z0-9À-ÿ._-]+)*)/g;
    
    const formatted = escaped.replace(mentionRegex, (match, fullName) => {
      const grp = this.activeGroup();
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
}
