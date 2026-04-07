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

import { AuthService } from '../../../services/auth.service';
import { MiniChatWidgetComponent } from '../mini-chat-widget/mini-chat-widget.component';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MiniChatWidgetComponent],
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
  route = inject(ActivatedRoute);
  router = inject(Router);
  platformId = inject(PLATFORM_ID);

  groupId = signal<number | null>(null);
  currentGroup = signal<ChatGroupDto | null>(null);

  currentUserId = signal<number>(this.authService.getCurrentUser()?.id || 1); 
  currentUser = computed(() => this.authService.getCurrentUser());
  publications = computed(() => this.publicationService.publications());
  notifications = computed(() => this.notificationService.notifications());
  unreadCount = computed(() => this.notificationService.unreadCount());
  
  isLiveNow = signal<boolean>(false);
  
  liveCommunityMembers = computed(() => {
    return this.userService.users().filter(u => u.isLive && u.id !== this.currentUserId());
  });

  @ViewChild('liveVideo') liveVideo?: ElementRef<HTMLVideoElement>;
  userMediaStream: MediaStream | null = null;
  
  getUserName(userId: number): string {
    // 1. Try to find in the fetched users list
    const user = this.userService.users().find(u => u.id === userId);
    if (user) {
      const fullName = [user.prenom, user.nom].filter(Boolean).join(' ');
      return fullName || 'User ' + userId;
    }

    // 2. Fallback: If it's the current user, use AuthService data
    const current = this.currentUser();
    if (current && current.id === userId) {
      const fullName = [current.prenom, current.nom].filter(Boolean).join(' ');
      return fullName || 'User ' + userId;
    }

    // 3. Last resort fallback
    return 'User ' + userId;
  }
 
  getUserInitials(userId: number): string {
    const name = this.getUserName(userId);
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getUserImage(userId: number): string | null {
    // 1. Try to find in the fetched users list
    const user = this.userService.users().find(u => u.id === userId);
    let imageUrl = null;
    if (user && user.image) {
      imageUrl = user.image;
    }

    // 2. Fallback: If it's the current user, use AuthService data
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
  selectedFile: File | null = null;
  newCommentContent: { [key: number]: string } = {};

  editingItemId: number | null = null;
  editingItemType: 'PUBLICATION' | 'COMMENT' | null = null;
  editingContent: string = '';
  editingType: string = 'EXPERIENCE';
  editingAnonymous: boolean = false;
  openDropdownId: number | null = null;

  // --- SHARING LOGIC ---
  showShareModal = signal<boolean>(false);
  sharingPost = signal<PublicationDto | null>(null);
  chatGroups = computed(() => this.chatGroupService.groups());
  shareSearchQuery = signal<string>('');
  
  filteredGroups = computed(() => {
    const query = this.shareSearchQuery().toLowerCase();
    return this.chatGroups().filter(g => 
      g.name.toLowerCase().includes(query) || 
      (g.description && g.description.toLowerCase().includes(query))
    );
  });

  openShareModal(pub: PublicationDto) {
    this.sharingPost.set(pub);
    this.showShareModal.set(true);
    this.chatGroupService.fetchGroups(); // Ensure groups are loaded
  }

  closeShareModal() {
    this.showShareModal.set(false);
    this.sharingPost.set(null);
    this.shareSearchQuery.set('');
  }

  sharePostToGroup(groupId: number) {
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
        this.refreshData(); // Refresh to update share count
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
          // Show a notification if someone went live
          if (liveMsg.status === 'Live Started') {
            // we create a transient notification that looks like a snackbar
            const liveBadge = {
              id: Date.now(),
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
      // Whenever users are updated, if any live member goes offline, end watch automatically
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
        } else {
          this.stopCamera();
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
          this.webRtcService.localStream = stream; // Provide to WebRtcService
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
    }
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['groupId']) {
        this.groupId.set(Number(params['groupId']));
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

    if (gid) {
      this.publicationService.fetchGroupFeed(gid);
      this.chatGroupService.fetchGroups(); // Refresh all just in case
      // Find the specific group
      this.chatGroupService.getGroupById(gid).subscribe(grp => this.currentGroup.set(grp));
    } else if (uid) {
      this.publicationService.fetchPersonalizedFeed(uid);
    } else {
      this.publicationService.fetchPublications();
    }

    this.notificationService.fetchNotifications(uid);
    this.userService.fetchUsers();
    
    // Check initial live status
    if (uid) {
      this.userService.getById(uid).subscribe(u => {
        const isNowLive = u.isLive || false;
        this.isLiveNow.set(isNowLive);
        if (isNowLive) {
          setTimeout(() => this.startCamera(), 300); // Give view time to init
        }
      });
    }
  }

  // --- EMOJI PICKER LOGIC ---
  showPostEmojiPicker = signal<boolean>(false);
  showCommentEmojiPicker = signal<{[key: number]: boolean}>({});
  
  readonly EMOJI_LIST = [
    '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😻','😼','😽','🙀','😿','😾',
    '👋','🤚','🖐','✋','🖖','👌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦿','🦶','👣','👂','🦻','👃','🧠','🦷','🦴','👀','👁','👅','👄',
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉','☸️','✡️','🔯',
    '🔥','✨','⭐','🌟','☁️','☀️','🌈','☘️','🍀','🌸','🌹','🌻','🌱','🌿','🍃','🍂','🍁','🍄','🌾','🌵','🌴','🌳','🌲'
  ];

  toggleEmojiPicker(type: 'POST' | 'COMMENT', id?: number) {
    if (type === 'POST') {
      this.showPostEmojiPicker.set(!this.showPostEmojiPicker());
    } else if (type === 'COMMENT' && id !== undefined) {
      const current = this.showCommentEmojiPicker();
      this.showCommentEmojiPicker.set({ ...current, [id]: !current[id] });
    }
  }

  addEmoji(emoji: string, type: 'POST' | 'COMMENT', id?: number) {
    if (type === 'POST') {
      this.newPubContent += emoji;
    } else if (type === 'COMMENT' && id !== undefined) {
      const currentVal = this.newCommentContent[id] || '';
      this.newCommentContent[id] = currentVal + emoji;
    }
  }
  // --- END EMOJI LOGIC ---

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedFile = file;
    }
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
    return index; // Tracking by index is safe here because we use object identity for the text
  }

  trackByPub(index: number, pub: PublicationDto) {
    return pub.id;
  }

  submitPublication() {
    const isVote = this.newPubType === 'VOTE';
    const hasContent = this.newPubContent && this.newPubContent.trim().length > 0;
    const hasQuestion = this.newPollQuestion && this.newPollQuestion.trim().length > 0;

    // Guard: Must have either content or a poll question if it's a vote
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

    // If it's a vote and user didn't write extra content, use the question as content
    const finalContent = hasContent ? this.newPubContent : (isVote ? this.newPollQuestion : '');

    this.publicationService.createPublication({
      content: finalContent,
      type: this.newPubType as any,
      authorId: this.currentUserId(),
      anonymous: this.newPubAnonymous,
      pollQuestion: isVote ? this.newPollQuestion : undefined,
      pollOptions: isVote ? validOptions : undefined,
      groupId: this.groupId() || undefined
    }, this.selectedFile || undefined).subscribe({
      next: () => {
        // Reset form
        this.newPubContent = '';
        this.newPollQuestion = '';
        this.newPollOptions = [{ text: '' }, { text: '' }];
        this.selectedFile = null;
        this.newPubType = 'EXPERIENCE';
        this.newPubAnonymous = false;
        
        this.refreshData();
      },
      error: (err) => {
        console.error('Error creating publication:', err);
        alert('Failed to post: ' + (err.error?.message || err.message || 'Please try again.'));
      }
    });
  }

  vote(pubId: number, optionIndex: number) {
    this.publicationService.voteInPoll(pubId, optionIndex, this.currentUserId()).subscribe({
      next: () => this.refreshData(),
      error: (err) => alert('Error voting: ' + (err.error?.message || err.message))
    });
  }

  toggleSupport(pubId: number) {
    this.publicationService.toggleSupport(pubId, this.currentUserId()).subscribe({
      next: () => this.refreshData(),
      error: (err) => alert('Error: ' + (err.error?.message || err.message))
    });
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

  submitComment(pubId: number) {
    const content = this.newCommentContent[pubId];
    if (!content?.trim()) return;
    this.commentService.createComment({
      content,
      publicationId: pubId,
      authorId: this.currentUserId()
    }).subscribe({
      next: () => {
        this.newCommentContent[pubId] = '';
        this.refreshData();
      },
      error: (err) => alert('Error posting comment: ' + (err.error?.message || err.message))
    });
  }

  deleteItem(id: number, type: 'PUBLICATION' | 'COMMENT') {
    this.openDropdownId = null;
    if (type === 'PUBLICATION') {
      this.publicationService.deletePublication(id).subscribe({
        next: () => this.refreshData(),
        error: (err) => alert('Error deleting publication: ' + (err.error?.message || err.message))
      });
    } else {
      this.commentService.deleteComment(id).subscribe({
        next: () => this.refreshData(),
        error: (err) => alert('Error deleting comment: ' + (err.error?.message || err.message))
      });
    }
  }

  startEdit(id: number, type: 'PUBLICATION' | 'COMMENT', content: string, pub?: PublicationDto) {
    this.openDropdownId = null;
    this.editingItemId = id;
    this.editingItemType = type;
    this.editingContent = content;
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
      }, this.selectedFile || undefined).subscribe({
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
        publicationId: 0 
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
    this.selectedFile = null;
  }

  toggleDropdown(id: number) {
    this.openDropdownId = this.openDropdownId === id ? null : id;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    // Dropdown handling
    if (!target.closest('.dropdown')) {
      this.openDropdownId = null;
    }

    // Emoji picker handling
    if (!target.closest('.emoji-picker-container') && !target.closest('.btn-emoji-toggle')) {
      this.showPostEmojiPicker.set(false);
      this.showCommentEmojiPicker.set({});
    }
  }
}
