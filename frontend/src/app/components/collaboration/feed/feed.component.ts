import { Component, inject, OnInit, signal, effect, untracked, PLATFORM_ID, computed, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PublicationService, PublicationDto } from '../../../services/collaboration/publication.service';
import { UserService } from '../../../services/user.service';
import { NotificationService } from '../../../services/collaboration/notification.service';
import { CommentService } from '../../../services/collaboration/comment.service';
import { WebSocketService } from '../../../services/collaboration/websocket.service';
import { MessageService } from '../../../services/collaboration/message.service';

import { MiniChatWidgetComponent } from '../mini-chat-widget/mini-chat-widget.component';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MiniChatWidgetComponent],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss']
})
export class FeedComponent implements OnInit {
  publicationService = inject(PublicationService);
  userService = inject(UserService);
  notificationService = inject(NotificationService);
  commentService = inject(CommentService);
  webSocketService = inject(WebSocketService);
  messageService = inject(MessageService);
  platformId = inject(PLATFORM_ID);

  currentUserId = signal<number>(1); // Simulated user ID
  publications = computed(() => this.publicationService.publications());
  notifications = computed(() => this.notificationService.notifications());
  
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
    if (isPlatformBrowser(this.platformId)) {
      this.refreshData();
    }
  }

  refreshData() {
    this.publicationService.fetchPublications();
    this.notificationService.fetchNotifications(this.currentUserId());
    this.userService.fetchUsers();
  }

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
      pollOptions: isVote ? validOptions : undefined
    }, this.selectedFile || undefined).subscribe({
      next: () => {
        // Reset form
        this.newPubContent = '';
        this.newPollQuestion = '';
        this.newPollOptions = [{ text: '' }, { text: '' }];
        this.selectedFile = null;
        this.newPubType = 'EXPERIENCE';
        this.newPubAnonymous = false;
        
        this.publicationService.fetchPublications();
      },
      error: (err) => {
        console.error('Error creating publication:', err);
        alert('Failed to post. Please try again.');
      }
    });
  }

  vote(pubId: number, optionIndex: number) {
    this.publicationService.voteInPoll(pubId, optionIndex, this.currentUserId()).subscribe(() => {
      this.publicationService.fetchPublications();
    });
  }

  getVotePercentage(pub: PublicationDto, option: any): number {
    if (!pub.pollOptions || pub.pollOptions.length === 0) return 0;
    const totalVotes = pub.pollOptions.reduce((sum, opt) => sum + (opt.votes || 0), 0);
    if (totalVotes === 0) return 0;
    return Math.round(((option.votes || 0) / totalVotes) * 100);
  }

  submitComment(pubId: number) {
    const content = this.newCommentContent[pubId];
    if (!content?.trim()) return;
    this.commentService.createComment({
      content,
      publicationId: pubId,
      authorId: this.currentUserId()
    }).subscribe(() => {
      this.newCommentContent[pubId] = '';
      this.publicationService.fetchPublications();
    });
  }

  deleteItem(id: number, type: 'PUBLICATION' | 'COMMENT') {
    this.openDropdownId = null;
    if (type === 'PUBLICATION') {
      this.publicationService.deletePublication(id).subscribe({
        next: () => this.publicationService.fetchPublications(),
        error: (err) => alert('Error deleting publication: ' + err.message)
      });
    } else {
      this.commentService.deleteComment(id).subscribe({
        next: () => this.publicationService.fetchPublications(),
        error: (err) => alert('Error deleting comment: ' + err.message)
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
          this.publicationService.fetchPublications();
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
          this.publicationService.fetchPublications();
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
    if (!target.closest('.dropdown')) {
      this.openDropdownId = null;
    }
  }

  deleteNotification(id: number) {
    this.notificationService.deleteNotification(id);
  }
}
