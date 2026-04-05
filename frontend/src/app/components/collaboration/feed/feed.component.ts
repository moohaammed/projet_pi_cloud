import { Component, inject, OnInit, signal, effect, untracked, PLATFORM_ID, computed, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { PublicationService, PublicationDto, SharedEventPreviewDto } from '../../../services/collaboration/publication.service';
import { AlzUserService } from '../../../services/alz-user.service';
import { CommentService } from '../../../services/collaboration/comment.service';
import { NotificationService } from '../../../services/collaboration/notification.service';
import { WebSocketService } from '../../../services/collaboration/websocket.service';
import { MessageService } from '../../../services/collaboration/message.service';
import { ChatGroupService, ChatGroupDto } from '../../../services/collaboration/chat-group.service';

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
  messageService = inject(MessageService);
  chatGroupService = inject(ChatGroupService);
  route = inject(ActivatedRoute);
  platformId = inject(PLATFORM_ID);

  groupId = signal<number | null>(null);
  currentGroup = signal<ChatGroupDto | null>(null);

  currentUserId = signal<number>(this.authService.getCurrentUser()?.id || 1); 
  currentUser = computed(() => this.authService.getCurrentUser());
  publications = computed(() => this.publicationService.publications());
  notifications = computed(() => this.notificationService.notifications());
  unreadCount = computed(() => this.notificationService.unreadCount());
  
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

  formatSharedEventDate(raw: string): string {
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
