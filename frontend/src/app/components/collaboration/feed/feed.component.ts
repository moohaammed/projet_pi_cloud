import { Component, inject, OnInit, signal, effect, untracked, PLATFORM_ID, computed, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { PublicationService, PublicationDto, SharedEventPreviewDto } from '../../../services/collaboration/publication.service';
import { AlzUserService } from '../../../services/alz-user.service';
import { CommentService } from '../../../services/collaboration/comment.service';
import { NotificationService } from '../../../services/collaboration/notification.service';
import { WebSocketService } from '../../../services/collaboration/websocket.service';
import { MessageService } from '../../../services/collaboration/message.service';
import { ChatGroupService, ChatGroupDto } from '../../../services/collaboration/chat-group.service';
import { WebRtcService } from '../../../services/collaboration/webrtc.service';
import { GuidanceService } from '../../../services/collaboration/guidance.service';
import { VoiceWelcomeComponent } from '../voice-welcome/voice-welcome.component';
import { SpeakOnHoverDirective } from '../../../directives/speak-on-hover.directive';
import { VoiceConversationComponent } from '../voice-conversation/voice-conversation.component';
import { VoiceConversationService } from '../../../services/collaboration/voice-conversation.service';
import { SpeechToTextService } from '../../../services/collaboration/speech-to-text.service';
import { AuthService } from '../../../services/auth.service';
import { MiniChatWidgetComponent } from '../mini-chat-widget/mini-chat-widget.component';
import { FloatingAssistantComponent } from '../floating-assistant/floating-assistant.component';
import { GlobalSearchService, SearchResponseDto } from '../../../services/collaboration/global-search.service';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MiniChatWidgetComponent, VoiceWelcomeComponent, SpeakOnHoverDirective, VoiceConversationComponent, FloatingAssistantComponent],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss']
})
export class FeedComponent implements OnInit {
  authService = inject(AuthService);
  publicationService = inject(PublicationService);
  userService = inject(AlzUserService);
  notificationService = inject(NotificationService);
  commentService = inject(CommentService);
  webSocketService = inject(WebSocketService);
  webRtcService = inject(WebRtcService);
  messageService = inject(MessageService);
  chatGroupService = inject(ChatGroupService);
  guidanceService = inject(GuidanceService);
  convService = inject(VoiceConversationService);
  sttService = inject(SpeechToTextService);
  globalSearchService = inject(GlobalSearchService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  platformId = inject(PLATFORM_ID);

  groupId = signal<string | null>(null);
  currentGroup = signal<ChatGroupDto | null>(null);

  currentUserId = signal<number>(this.authService.getCurrentUser()?.id || 1); 
  currentUser = computed(() => this.authService.getCurrentUser());
  publications = computed(() => this.publicationService.publications());
  notifications = computed(() => this.notificationService.notifications());
  unreadCount = computed(() => this.notificationService.unreadCount());

  globalSearchQuery = signal<string>('');
  globalSearchTags = signal<string>('');
  globalSearchResults = signal<SearchResponseDto[]>([]);
  isGlobalSearchLoading = signal<boolean>(false);
  showGlobalSearchDropdown = signal<boolean>(false);

  executeGlobalSearch() {
    const q = this.globalSearchQuery().trim();
    const t = this.globalSearchTags().trim();
    if (!q && !t) {
      this.globalSearchResults.set([]);
      this.showGlobalSearchDropdown.set(false);
      return;
    }

    this.isGlobalSearchLoading.set(true);
    this.showGlobalSearchDropdown.set(true);
    
    const tagsArr = t ? t.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : [];

    this.globalSearchService.search(q, tagsArr).subscribe({
      next: (res) => {
        this.globalSearchResults.set(res);
        this.isGlobalSearchLoading.set(false);
      },
      error: (err) => {
        console.error('Global search error:', err);
        this.isGlobalSearchLoading.set(false);
      }
    });
  }

  feedSearchType = signal<string>('ALL');
  feedSearchQuery = signal<string>('');
  selectedTopic = signal<string | null>(null);

  readonly TRENDING_TOPICS = ['Alzheimer', 'CareBot', 'DailyCare', 'Support', 'Memory', 'Nutrition', 'Safety'];

  filteredPublications = computed(() => {
    const type = this.feedSearchType();
    const query = this.feedSearchQuery().toLowerCase().trim();
    const topic = this.selectedTopic();
    const currentGroupId = this.groupId();
    const allPublictions = this.publicationService.publications();
    
    let list = [...allPublictions];

    // Debugging (Remove after verification)
    console.log(`[FeedFilter] Filtering ${list.length} posts. Filters:`, { type, query, topic, currentGroupId });

    // 1. Filter by Group Context
    if (currentGroupId) {
      list = list.filter(p => p.groupId === currentGroupId);
    }

    // 2. Filter by Content Type (Tab)
    if (type && type !== 'ALL') {
      list = list.filter(p => p.type === type);
    }

    // 3. Filter by Selected Topic (Tag or Content Mention)
    if (topic) {
      const lowerTopic = topic.toLowerCase();
      list = list.filter(p => {
        // Check explicit tags
        const hasTag = p.tags && Array.isArray(p.tags) && p.tags.some(t => t && t.toLowerCase() === lowerTopic);
        // Fallback: Check if the word is exactly mentioned in the content
        const hasContentMention = p.content && p.content.toLowerCase().includes(lowerTopic);
        
        return hasTag || hasContentMention;
      });
    }

    // 4. Filter by Text Query (Keyword)
    if (query) {
      list = list.filter(p => {
        const contentMatch = p.content && p.content.toLowerCase().includes(query);
        const authorMatch = p.authorName && p.authorName.toLowerCase().includes(query);
        const tagMatch = p.tags && Array.isArray(p.tags) && p.tags.some(t => t && t.toLowerCase().includes(query));
        const pollMatch = p.pollQuestion && p.pollQuestion.toLowerCase().includes(query);
        return contentMatch || authorMatch || tagMatch || pollMatch;
      });
    }
    
    return list;
  });

  toggleTopic(topic: string) {
    if (this.selectedTopic() === topic) {
      this.selectedTopic.set(null);
    } else {
      this.selectedTopic.set(topic);
    }
  }

  clearFilters() {
    this.feedSearchQuery.set('');
    this.selectedTopic.set(null);
    this.feedSearchType.set('ALL');
  }

  countByType(type: string): number {
    const currentGroupId = this.groupId();
    let list = this.publicationService.publications();
    if (currentGroupId) list = list.filter(p => p.groupId === currentGroupId);
    return list.filter(p => p.type === type).length;
  }
  
  isLiveNow = signal<boolean>(false);
  
  liveCommunityMembers = computed(() => {
    return this.userService.users().filter(u => u.isLive && u.id !== this.currentUserId());
  });

  liveComments = signal<{authorName: string; content: string; sentAt: string}[]>([]);
  liveCommentInput = '';
  private liveSubscribedTo = new Set<number>();

  sendLiveComment(broadcasterId: number) {
    if (!this.liveCommentInput.trim()) return;
    this.messageService.sendLiveComment(this.currentUserId(), broadcasterId, this.liveCommentInput.trim())
      .subscribe({ error: (e) => console.error('Live comment error', e) });
    this.liveCommentInput = '';
  }

  @ViewChild('liveVideo') liveVideo?: ElementRef<HTMLVideoElement>;
  userMediaStream: MediaStream | null = null;
  
  getUserName(userId: number): string {
    const user = this.userService.users().find(u => u.id === userId);
    if (user) {
      const fullName = [user.prenom, user.nom].filter(Boolean).join(' ');
      return fullName || 'User ' + userId;
    }

    const current = this.currentUser();
    if (current && current.id === userId) {
      const fullName = [current.prenom, current.nom].filter(Boolean).join(' ');
      return fullName || 'User ' + userId;
    }

    return 'User ' + userId;
  }
 
  getUserInitials(userId: number): string {
    const name = this.getUserName(userId);
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getUserImage(userId: number): string | null {
    const user = this.userService.users().find(u => u.id === userId);
    let imageUrl = null;
    if (user && user.image) {
      imageUrl = user.image;
    }

    if (!imageUrl) {
      const current = this.currentUser();
      if (current && current.id === userId && current.image) {
        imageUrl = current.image;
      }
    }

    if (imageUrl && imageUrl.startsWith('/uploads/')) {
      return 'http://localhost:8080' + imageUrl;
    }
    return imageUrl;
  }
  
  newPubContent = '';
  newPubType = 'EXPERIENCE';
  newPubAnonymous = false;
  newPollQuestion = '';
  newPollOptions: { text: string }[] = [{ text: '' }, { text: '' }];
  selectedFiles: File[] = [];
  newCommentContent: { [key: string]: string } = {};

  editingItemId: string | null = null;
  editingItemType: 'PUBLICATION' | 'COMMENT' | null = null;
  editingContent: string = '';
  editingType: string = 'EXPERIENCE';
  editingAnonymous: boolean = false;
  editingPublicationId: string = '';
  openDropdownId: string | null = null;
  showNotifDropdown = false;

  // --- SHARING LOGIC ---
  showShareModal = signal<boolean>(false);
  sharingPost = signal<PublicationDto | null>(null);
  chatGroups = computed(() => this.chatGroupService.groups());
  shareSearchQuery = signal<string>('');
  
  // --- MEDIA VIEWER LOGIC ---
  showMediaViewer = signal<boolean>(false);
  viewingMediaUrl = signal<string>('');
  
  // --- COMMENTS MODAL LOGIC ---
  showCommentsModal = signal<boolean>(false);
  commentsForPost = signal<PublicationDto | null>(null);
  
  filteredGroups = computed(() => {
    const query = this.shareSearchQuery().toLowerCase();
    const uid = this.currentUserId();
    return this.chatGroups().filter(g => 
      (g.name.toLowerCase().includes(query) || 
      (g.description && g.description.toLowerCase().includes(query))) &&
      g.members.some(m => m.id === uid)
    );
  });

  openShareModal(pub: PublicationDto) {
    this.sharingPost.set(pub);
    this.showShareModal.set(true);
    this.chatGroupService.fetchGroups();
  }

  closeShareModal() {
    this.showShareModal.set(false);
    this.sharingPost.set(null);
    this.shareSearchQuery.set('');
  }
  
  openMedia(url: string) {
    this.viewingMediaUrl.set(url);
    this.showMediaViewer.set(true);
  }
  
  closeMediaViewer() {
    this.showMediaViewer.set(false);
    this.viewingMediaUrl.set('');
  }
  
  openCommentsModal(pub: PublicationDto) {
    this.commentsForPost.set(pub);
    this.showCommentsModal.set(true);
  }
  
  closeCommentsModal() {
    this.showCommentsModal.set(false);
    this.commentsForPost.set(null);
  }

  sharePostToGroup(groupId: string) {
    const pub = this.sharingPost();
    if (!pub || !pub.id) return;

    this.messageService.createMessage({
      content: `Shared a post: "${pub.content?.substring(0, 50)}${pub.content && pub.content.length > 50 ? '...' : ''}"`,
      senderId: this.currentUserId(),
      chatGroupId: groupId,
      type: 'PUBLICATION',
      sharedPublicationId: pub.id
    }).subscribe({
      next: () => {
        alert('Post shared successfully!');
        this.closeShareModal();
        this.refreshData();
      },
      error: (err) => {
        console.error(err);
        alert('Failed to share post: ' + (err.error?.message || err.message));
      }
    });
  }
  // --- END SHARING LOGIC ---

  constructor() {
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
      const notif = this.webSocketService.notificationMessage();
      if (notif) {
        untracked(() => {
          this.notificationService.addNotification(notif);
          this.guidanceService.speakNotification(notif.content, notif.type);

          if (notif.type === 'CAREBOT' || notif.type === 'VOICE_PROMPT') {
            setTimeout(() => {
              this.convService.ask({
                question: notif.content,
                actions: [
                  {
                    label: 'Okay, I understand',
                    keyword: ['okay', 'ok', 'yes', 'understood', 'thanks', 'thank'],
                    callback: () => this.guidanceService.speakImmediate('Good. Take care of yourself.')
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
      const liveMsg = this.webSocketService.liveStatusMessage();
      if (liveMsg) {
        untracked(() => {
          if (liveMsg.userId === this.currentUserId()) {
            this.isLiveNow.set(liveMsg.status === 'Live Started');
          } else {
            this.userService.updateUserLiveStatus(liveMsg.userId, liveMsg.status === 'Live Started');
          }
          if (liveMsg.status === 'Live Started') {
            const liveBadge = {
              id: Date.now().toString(),
              receiverId: this.currentUserId(),
              content: `${liveMsg.userName} just went LIVE in the circle! 🔴`,
              type: 'LIVE',
              isRead: false,
              createdAt: new Date().toISOString()
            };
            this.notificationService.addNotification(liveBadge);
          }
        });
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const sigMsg = this.webSocketService.webrtcSignal();
      if (sigMsg) {
        untracked(() => {
          this.webRtcService.handleSignal(sigMsg, this.currentUserId());
        });
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const comment = this.webSocketService.liveComment();
      if (comment) {
        untracked(() => {
          this.liveComments.update(list => [...list.slice(-99), {
            authorName: comment.senderName || ('User ' + comment.senderId),
            content: comment.content,
            sentAt: comment.sentAt || new Date().toISOString()
          }]);
        });
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const liveUsers = this.liveCommunityMembers();
      untracked(() => {
        const remoteStreams = this.webRtcService.remoteStreams();
        Object.keys(remoteStreams).forEach(broadcasterIdStr => {
          const bId = Number(broadcasterIdStr);
          if (!liveUsers.find(u => u.id === bId)) {
            this.webRtcService.endWatch(bId);
          }
        });
      });
    });
  }

  toggleGoLive() {
    this.userService.toggleLive(this.currentUserId()).subscribe({
      next: (updatedUser) => {
        const isNowLive = updatedUser.isLive || false;
        this.isLiveNow.set(isNowLive);
        if (isNowLive) {
          this.startCamera();
          this.liveComments.set([]);
          this.liveSubscribedTo.add(this.currentUserId());
          this.webSocketService.subscribeToLiveComments(this.currentUserId());
        } else {
          this.stopCamera();
          this.liveSubscribedTo.delete(this.currentUserId());
        }
      },
      error: (err) => console.error('Failed to toggle live state', err)
    });
  }

  startCamera() {
    if (isPlatformBrowser(this.platformId) && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          this.userMediaStream = stream;
          this.webRtcService.localStream = stream;
          if (this.liveVideo && this.liveVideo.nativeElement) {
            this.liveVideo.nativeElement.srcObject = stream;
          }
        })
        .catch(err => {
          console.error('Error accessing media devices.', err);
          alert('Could not access your camera. Please check permissions.');
        });
    }
  }

  stopCamera() {
    this.webRtcService.stopAll();
    if (this.userMediaStream) {
      this.userMediaStream.getTracks().forEach(track => track.stop());
      this.userMediaStream = null;
    }
    if (this.liveVideo && this.liveVideo.nativeElement) {
      this.liveVideo.nativeElement.srcObject = null;
    }
  }

  watchCommunityStream(broadcasterId: number) {
    if (broadcasterId) {
      this.webRtcService.watchStream(broadcasterId, this.currentUserId());
      if (!this.liveSubscribedTo.has(broadcasterId)) {
        this.liveSubscribedTo.add(broadcasterId);
        this.liveComments.set([]);
        this.webSocketService.subscribeToLiveComments(broadcasterId);
      }
    }
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.guidanceService.loadAndSpeak('feed');
    }
    this.route.params.subscribe(params => {
      if (params['groupId']) {
        this.groupId.set(params['groupId'] as string);
      } else {
        this.groupId.set(null);
      }
      if (isPlatformBrowser(this.platformId)) {
        this.refreshData();
      }
    });
  }

  openDmChat(userId: number) {
    this.router.navigate(['/collaboration/messenger'], { queryParams: { dm: userId } });
  }

  refreshData() {
    const gid = this.groupId();
    const uid = this.currentUserId();

    // Always fetch groups to keep membership status up to date
    this.chatGroupService.fetchGroups();

    if (gid) {
      this.publicationService.fetchGroupFeed(gid);
      this.chatGroupService.getGroupById(gid).subscribe(grp => this.currentGroup.set(grp));
    } else if (uid) {
      this.publicationService.fetchPersonalizedFeed(uid);
    } else {
      this.publicationService.fetchPublications();
    }

    this.notificationService.fetchNotifications(uid);
    this.userService.fetchUsers();

    if (uid) {
      this.userService.getById(uid).subscribe(u => {
        const isNowLive = u.isLive || false;
        this.isLiveNow.set(isNowLive);
        if (isNowLive) {
          setTimeout(() => this.startCamera(), 300);
        }
      });
    }
  }

  // --- EMOJI PICKER LOGIC ---
  showPostEmojiPicker = signal<boolean>(false);
  showCommentEmojiPicker = signal<{[key: string]: boolean}>({});
  
  readonly EMOJI_LIST = [
    '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😻','😼','😽','🙀','😿','😾',
    '👋','🤚','🖐','✋','🖖','👌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦿','🦶','👣','👂','🦻','👃','🧠','🦷','🦴','👀','👁','👅','👄',
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉','☸️','✡️','🔯',
    '🔥','✨','⭐','🌟','☁️','☀️','🌈','☘️','🍀','🌸','🌹','🌻','🌱','🌿','🍃','🍂','🍁','🍄','🌾','🌵','🌴','🌳','🌲'
  ];

  toggleEmojiPicker(type: 'POST' | 'COMMENT', id?: string) {
    if (type === 'POST') {
      this.showPostEmojiPicker.set(!this.showPostEmojiPicker());
    } else if (type === 'COMMENT' && id !== undefined) {
      const current = this.showCommentEmojiPicker();
      const newState = { ...current, [id]: !current[id] };
      console.log('Toggling emoji picker for comment:', id, 'New state:', newState);
      this.showCommentEmojiPicker.set(newState);
    }
  }

  addEmoji(emoji: string, type: 'POST' | 'COMMENT', id?: string) {
    if (type === 'POST') {
      this.newPubContent += emoji;
    } else if (type === 'COMMENT' && id !== undefined) {
      const currentVal = this.newCommentContent[id] || '';
      this.newCommentContent[id] = currentVal + emoji;
      console.log('Added emoji to comment:', id, 'New content:', this.newCommentContent[id]);
    }
  }
  // --- END EMOJI LOGIC ---

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
    }
  }
  
  removeSelectedFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  addPollOption() {
    this.newPollOptions.push({ text: '' });
  }

  removePollOption(index: number) {
    if (this.newPollOptions.length > 2) {
      this.newPollOptions.splice(index, 1);
    }
  }

  trackByOption(index: number, option: any) {
    return index;
  }

  trackByPub(index: number, pub: PublicationDto) {
    return pub.id;
  }

  /**
   * Listens for the user's voice and fills the post textarea with what they say.
   * After dictation, asks them to confirm before posting.
   */
  startVoicePost() {
    if (!this.sttService.isSupported) {
      this.guidanceService.speakImmediate('Voice input is not supported in your browser.');
      return;
    }
    this.sttService.askAndListen('What would you like to share with the community? Speak now.').then(transcript => {
      if (!transcript.trim()) return;
      this.newPubContent = transcript;
      this.convService.ask({
        question: `You said: "${transcript.substring(0, 80)}". Would you like to post this?`,
        actions: [
          {
            label: 'Yes, post it',
            keyword: ['yes', 'post', 'share', 'send', 'sure', 'okay'],
            callback: () => this.doSubmitPublication(transcript, false, [])
          },
          {
            label: 'No, let me edit',
            keyword: ['no', 'edit', 'change', 'cancel'],
            callback: () => this.guidanceService.speakImmediate('Okay, your text is in the box. You can change it before posting.')
          }
        ]
      });
    }).catch(() => {
      this.guidanceService.speakImmediate('I could not hear you. Please try again.');
    });
  }

  submitPublication() {
    const isVote = this.newPubType === 'VOTE';
    const hasContent = this.newPubContent && this.newPubContent.trim().length > 0;
    const hasQuestion = this.newPollQuestion && this.newPollQuestion.trim().length > 0;

    if (!hasContent && !hasQuestion) {
      alert('Please enter some content or a poll question.');
      return;
    }
    
    let validOptions: string[] = [];
    if (isVote) {
      validOptions = this.newPollOptions
        .map(o => o.text.trim())
        .filter(t => t.length > 0);

      if (validOptions.length < 2) {
        alert('Please provide at least 2 valid options for the poll.');
        return;
      }
      if (!hasQuestion) {
        alert('Please provide a poll question.');
        return;
      }
    }

    const finalContent = hasContent ? this.newPubContent : (isVote ? this.newPollQuestion : '');

    if (this.guidanceService.voiceUnlocked()) {
      const preview = finalContent.substring(0, 60);
      this.convService.ask({
        question: `You are about to post: "${preview}". Would you like to share this with the community?`,
        actions: [
          {
            label: 'Yes, post it',
            keyword: ['yes', 'post', 'share', 'send', 'sure', 'okay'],
            callback: () => this.doSubmitPublication(finalContent, isVote, validOptions)
          },
          {
            label: 'No, cancel',
            keyword: ['no', 'cancel', 'delete', 'stop'],
            callback: () => this.guidanceService.speakImmediate('Post cancelled. Your text is still here if you want to change it.')
          }
        ]
      });
    } else {
      this.doSubmitPublication(finalContent, isVote, validOptions);
    }
  }

  private doSubmitPublication(finalContent: string, isVote: boolean, validOptions: string[]) {
    this.publicationService.createPublication({
      content: finalContent,
      type: this.newPubType as any,
      authorId: this.currentUserId(),
      anonymous: this.newPubAnonymous,
      pollQuestion: isVote ? this.newPollQuestion : undefined,
      pollOptions: isVote ? validOptions : undefined,
      groupId: this.groupId() || undefined
    }, this.selectedFiles.length > 0 ? this.selectedFiles : undefined).subscribe({
      next: () => {
        this.newPubContent = '';
        this.newPollQuestion = '';
        this.newPollOptions = [{ text: '' }, { text: '' }];
        this.selectedFiles = [];
        this.newPubType = 'EXPERIENCE';
        this.newPubAnonymous = false;
        this.guidanceService.speakImmediate('Your post has been shared with the community.');
        this.refreshData();
      },
      error: (err) => {
        alert('Failed to post: ' + (err.error?.message || err.message || 'Please try again.'));
      }
    });
  }

  vote(pubId: string, optionIndex: number) {
    this.publicationService.voteInPoll(pubId, optionIndex, this.currentUserId()).subscribe({
      next: () => this.refreshData(),
      error: (err) => alert('Error voting: ' + (err.error?.message || err.message))
    });
  }

  toggleSupport(pubId: string) {
    const pub = this.publicationService.publications().find(p => p.id === pubId);
    const alreadySupported = this.isSupportedByMe(pub!);

    if (!alreadySupported && this.guidanceService.voiceUnlocked()) {
      const authorName = pub?.authorName || 'this person';
      this.convService.ask({
        question: `Would you like to show support for ${authorName}'s post?`,
        actions: [
          {
            label: 'Yes, support',
            keyword: ['yes', 'sure', 'support', 'okay'],
            callback: () => {
              this.publicationService.toggleSupport(pubId, this.currentUserId()).subscribe({
                next: () => {
                  this.guidanceService.speakImmediate(`You supported ${authorName}'s post.`);
                  this.refreshData();
                },
                error: () => {}
              });
            }
          },
          {
            label: 'No',
            keyword: ['no', 'cancel', 'skip'],
            callback: () => this.guidanceService.speakImmediate('Okay, no problem.')
          }
        ]
      });
    } else {
      this.publicationService.toggleSupport(pubId, this.currentUserId()).subscribe({
        next: () => this.refreshData(),
        error: (err) => alert('Error: ' + (err.error?.message || err.message))
      });
    }
  }

  isSupportedByMe(pub: PublicationDto): boolean {
    if (!pub.supportIds) return false;
    const ids = pub.supportIds.split(',');
    return ids.includes(this.currentUserId().toString());
  }

  getVotePercentage(pub: PublicationDto, option: any): number {
    if (!pub.pollOptions || pub.pollOptions.length === 0) return 0;
    const totalVotes = pub.pollOptions.reduce((sum, opt) => sum + (opt.votes || 0), 0);
    if (totalVotes === 0) return 0;
    return Math.round(((option.votes || 0) / totalVotes) * 100);
  }

  sharedEventImageUrl(ev: SharedEventPreviewDto): string {
    if (ev.imageUrl) return 'http://localhost:8080' + ev.imageUrl;
    return 'assets/images/event-placeholder.jpg';
  }

  onSharedEventImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/event-placeholder.jpg';
  }

  formatSharedEventDate(raw: string | undefined): string {
    if (!raw) return 'Not specified';
    try {
      return new Date(raw).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return raw;
    }
  }

  submitComment(pubId: string) {
    const content = this.newCommentContent[pubId];
    if (!content?.trim()) return;

    if (this.guidanceService.voiceUnlocked()) {
      this.convService.ask({
        question: `You wrote: "${content.substring(0, 60)}". Would you like to post this comment?`,
        actions: [
          {
            label: 'Yes, post it',
            keyword: ['yes', 'post', 'send', 'sure', 'okay'],
            callback: () => {
              this.commentService.createComment({
                content,
                publicationId: pubId,
                authorId: this.currentUserId()
              }).subscribe({
                next: (newComment) => {
                  this.newCommentContent[pubId] = '';
                  this.guidanceService.speakImmediate('Your comment has been posted.');
                  
                  if (this.showCommentsModal() && this.commentsForPost()?.id === pubId) {
                    const currentPost = this.commentsForPost();
                    if (currentPost) {
                      const updatedPost: PublicationDto = {
                        ...currentPost,
                        comments: [...(currentPost.comments || []), newComment as any],
                        commentCount: (currentPost.commentCount || 0) + 1
                      };
                      this.commentsForPost.set(updatedPost);
                    }
                  }
                  
                  this.refreshData();
                },
                error: (err) => alert('Error posting comment: ' + (err.error?.message || err.message))
              });
            }
          },
          {
            label: 'No, cancel',
            keyword: ['no', 'cancel', 'delete', 'remove'],
            callback: () => {
              this.newCommentContent[pubId] = '';
              this.guidanceService.speakImmediate('Comment cancelled.');
            }
          }
        ]
      });
    } else {
      this.commentService.createComment({
        content,
        publicationId: pubId,
        authorId: this.currentUserId()
      }).subscribe({
        next: (newComment) => {
          this.newCommentContent[pubId] = '';
          
          if (this.showCommentsModal() && this.commentsForPost()?.id === pubId) {
            const currentPost = this.commentsForPost();
            if (currentPost) {
              const updatedPost: PublicationDto = {
                ...currentPost,
                comments: [...(currentPost.comments || []), newComment as any],
                commentCount: (currentPost.commentCount || 0) + 1
              };
              this.commentsForPost.set(updatedPost);
            }
          }
          
          this.refreshData();
        },
        error: (err) => alert('Error posting comment: ' + (err.error?.message || err.message))
      });
    }
  }

  deleteItem(id: string, type: 'PUBLICATION' | 'COMMENT', publicationId?: string) {
    this.openDropdownId = null;
    if (type === 'PUBLICATION') {
      this.publicationService.deletePublication(id).subscribe({
        next: () => this.refreshData(),
        error: (err) => alert('Error deleting publication: ' + (err.error?.message || err.message))
      });
    } else {
      this.commentService.deleteComment(id, publicationId!).subscribe({
        next: () => this.refreshData(),
        error: (err) => alert('Error deleting comment: ' + (err.error?.message || err.message))
      });
    }
  }

  startEdit(id: string, type: 'PUBLICATION' | 'COMMENT', content: string, pub?: PublicationDto, parentPubId?: string) {
    this.openDropdownId = null;
    this.editingItemId = id;
    this.editingItemType = type;
    this.editingContent = content;
    this.editingPublicationId = parentPubId || '';
    this.selectedFiles = [];
    if (type === 'PUBLICATION' && pub) {
      this.editingType = pub.type || 'EXPERIENCE';
      this.editingAnonymous = pub.anonymous || false;
    }
  }

  saveEdit() {
    if (this.editingItemId === null || !this.editingItemType) return;
    if (this.editingItemType === 'PUBLICATION') {
      this.publicationService.updatePublication(this.editingItemId, {
        content: this.editingContent,
        type: this.editingType as any,
        authorId: this.currentUserId(),
        anonymous: this.editingAnonymous
      }, undefined).subscribe({
        next: () => {
          this.cancelEdit();
          this.refreshData();
        },
        error: (err) => {
          console.error(err);
          alert('Error updating publication: ' + (err.error?.message || err.message || 'Unknown error'));
        }
      });
    } else {
      this.commentService.updateComment(this.editingItemId, {
        content: this.editingContent,
        authorId: this.currentUserId(),
        publicationId: this.editingPublicationId
      }).subscribe({
        next: () => {
          this.cancelEdit();
          this.refreshData();
        },
        error: (err) => {
          console.error(err);
          alert('Error updating comment: ' + (err.error?.message || err.message || 'Unknown error'));
        }
      });
    }
  }

  cancelEdit() {
    this.editingItemId = null;
    this.editingItemType = null;
    this.editingContent = '';
    this.editingPublicationId = '';
    this.selectedFiles = [];
  }

  toggleDropdown(id: string) {
    this.openDropdownId = this.openDropdownId === id ? null : id;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    if (!target.closest('.dropdown')) {
      this.openDropdownId = null;
    }

    if (!target.closest('[data-notif-bell]')) {
      this.showNotifDropdown = false;
    }

    if (!target.closest('.emoji-picker-container') && 
        !target.closest('.emoji-picker-comment') && 
        !target.closest('.btn-emoji-toggle')) {
      this.showPostEmojiPicker.set(false);
      this.showCommentEmojiPicker.set({});
    }
  }
}
