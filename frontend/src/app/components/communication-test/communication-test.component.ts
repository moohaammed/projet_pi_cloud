// Collaborative Communication Component - Module 8
import { Component, inject, OnInit, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicationService, Publication } from '../../services/publication.service';
import { MessageService, Message } from '../../services/message.service';
import { ChatGroupService, ChatGroup } from '../../services/chat-group.service';
import { WebSocketService } from '../../services/websocket.service';
import { UserService } from '../../services/user.service';
import { CommentService, Comment } from '../../services/comment.service';
import { signal as angularSignal } from '@angular/core';

@Component({
  selector: 'app-communication-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="test-container">
      <h1>Module 8: Collaborative Communication</h1>

      <!-- User Login Simulator -->
      <section class="card" style="background: #e3f2fd; border-color: #b6d4fe;">
        <div class="form-group row" style="align-items: center; justify-content: center;">
            <label style="font-weight: bold; margin-right: 10px;">Simulate Login as User ID:</label>
            <input type="number" [(ngModel)]="currentUserId" style="max-width: 100px; text-align: center; font-weight: bold;" />
        </div>
      </section>

      <!-- Dashboard (Visible when no chat is active) -->
      <div *ngIf="!chatGroupService.activeGroup()" style="display: flex; gap: 20px;">
      
        <!-- LEFT COLUMN: Global Feed -->
        <section class="card" style="flex: 2;">
          <h2>Global Feed</h2>
          
          <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 20px;">
            <div class="form-group row">
                <select [(ngModel)]="newPubType" style="padding: 10px; border-radius: 4px; border: 1px solid #ccc; max-width: 200px;">
                    <option value="EXPERIENCE">Experience</option>
                    <option value="TEMOIGNAGE">Témoignage</option>
                    <option value="ANNOUNCEMENT">Announcement</option>
                </select>
            </div>
            <div class="form-group">
              <textarea [(ngModel)]="newPubContent" placeholder="Post an update to the global feed..." style="height: 80px;"></textarea>
              <div class="flex-between" style="margin-top: 10px;">
                  <input type="file" (change)="onFileSelected($event)" accept="image/*,video/*,application/pdf" />
                  <button (click)="submitPublication()">Post Publication</button>
              </div>
            </div>
          </div>
          
          <div *ngFor="let pub of publicationService.publications()" class="list-item" style="margin-top: 15px; padding: 15px;">
            <div class="flex-between">
                <strong><span style="display:inline-block; width:25px; height:25px; background:#0d6efd; color:white; border-radius:50%; text-align:center; line-height:25px; margin-right:5px;">U</span> User {{pub.author?.id || 'Unknown'}}</strong>
                <span style="background: #e9ecef; padding: 3px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; color: #555;">{{pub.type}}</span>
            </div>
            
            <div *ngIf="$any(pub).isDistressed" style="background: #fff5f5; border: 1px solid #feb2b2; color: #c53030; padding: 8px; border-radius: 6px; margin: 10px 0; font-weight: bold; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                <span style="background: #c53030; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">!</span>
                Caregiver Alert: This post shows signs of worry or distress.
            </div>

            <p style="margin: 15px 0; font-size: 1.05rem; line-height: 1.4;">{{pub.content}}</p>
            
            <!-- Media Rendering -->
            <div *ngIf="pub.mediaUrl" style="margin-top: 10px; border-radius: 8px; overflow: hidden; border: 1px solid #eee;">
                <img *ngIf="pub.mimeType?.startsWith('image/')" [src]="'http://localhost:8080' + pub.mediaUrl" style="width: 100%; max-height: 400px; object-fit: cover;" />
                <video *ngIf="pub.mimeType?.startsWith('video/')" [src]="'http://localhost:8080' + pub.mediaUrl" controls style="width: 100%; border-radius: 8px;"></video>
                <div *ngIf="!pub.mimeType?.startsWith('image/') && !pub.mimeType?.startsWith('video/')" style="padding: 15px; background: #f8f9fa; border-top: 1px solid #eee;">
                    <a [href]="'http://localhost:8080' + pub.mediaUrl" target="_blank" style="color: #0d6efd; font-weight: bold; text-decoration: none;">Download Attached Document</a>
                </div>
            </div>
            <div style="margin-top: 10px; font-size: 0.8rem; color: #888; border-top: 1px solid #eee; padding-top: 10px;">Posted exactly on {{pub.createdAt | date:'medium'}}</div>

            <!-- Comments Section -->
            <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                <h6 style="font-size: 0.9rem; color: #666; margin-bottom: 10px;">Comments ({{pub.comments?.length || 0}})</h6>
                
                <div *ngFor="let comment of pub.comments" style="background: #f8f9fa; padding: 10px; border-radius: 8px; margin-bottom: 8px; font-size: 0.9rem;">
                    <strong>User {{comment.author?.id}}:</strong> {{comment.content}}
                    <div style="font-size: 0.75rem; color: #999; margin-top: 3px;">{{comment.createdAt | date:'short'}}</div>
                </div>

                <!-- Add Comment Form -->
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <input type="text" 
                           [(ngModel)]="newCommentContent[pub.id!]" 
                           placeholder="Add a comment..." 
                           style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem;">
                    <button (click)="submitComment(pub.id!)" 
                            style="background: #0d6efd; color: white; border: none; padding: 5px 15px; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                        Reply
                    </button>
                </div>
            </div>
          </div>
        </section>

        <!-- RIGHT COLUMN: Discover Groups -->
        <section class="card" style="flex: 1; background: #f8f9fa;">
          <h2 style="margin-top: 0;">Discover Groups</h2>
          <button (click)="chatGroupService.fetchGroups()" style="width: 100%; margin-bottom: 15px; background: #6c757d;">Refresh Directory</button>
          
          <div *ngFor="let grp of chatGroupService.groups()" class="list-item" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px; padding: 15px; border-left: 4px solid #0d6efd;">
            <div>
                <strong style="font-size: 1.1rem; display: block;">{{grp.name}}</strong>
                <span style="font-size: 0.9rem; color: #666; display: block; margin-top: 3px;">{{grp.description}}</span>
            </div>
            
            <div class="flex-between">
                <span *ngIf="grp.theme" style="background: #e3f2fd; color: #0d6efd; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">{{grp.theme}}</span>
                <span style="font-size:0.8rem; color:#888;">{{grp.members?.length || 0}} Members</span>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 5px 0;" />
            
            <!-- Conditionally Render Join vs Enter -->
            <ng-container *ngIf="isMemberOf(grp)">
                <button (click)="enterGroup(grp)" style="background: #28a745; width: 100%;">Enter Chat</button>
            </ng-container>
            <ng-container *ngIf="!isMemberOf(grp)">
                <button (click)="chatGroupService.joinGroup(grp.id!, currentUserId)" style="background: #ffc107; color: #000; width: 100%; font-weight: bold;">+ Join Group</button>
            </ng-container>
          </div>

          <!-- Create Group Collapsible/Area -->
          <div style="margin-top: 30px; border-top: 2px dashed #ccc; padding-top: 15px;">
              <h3 style="margin-top: 0; font-size: 1.1rem;">Create a New Group</h3>
              <div class="form-group">
                <input [(ngModel)]="newGroupName" placeholder="Group Name" />
                <input [(ngModel)]="newGroupDesc" placeholder="Group Description" />
                <select [(ngModel)]="newGroupTheme" style="padding: 10px; border-radius: 4px; border: 1px solid #ccc;">
                  <option value="SUPPORT">Medical Support</option>
                  <option value="SOCIAL">Social / Hobbies</option>
                  <option value="REGIONAL">Regional Meetups</option>
                </select>
                
                <div class="user-picker" style="max-height: 100px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; border-radius: 4px; background: white;">
                    <div style="font-size: 0.8rem; font-weight: bold; color: #555; margin-bottom: 5px;">Invite Members:</div>
                    <div *ngFor="let u of userService.users()" style="margin-bottom: 2px;">
                        <label style="font-size: 0.9rem; cursor: pointer;">
                            <input type="checkbox" [value]="u.id" [checked]="selectedUserIds.includes(u.id)" (change)="toggleUserSelection(u.id, $event)">
                            {{u.name}} <em style="font-size:0.7rem;">(ID: {{u.id}})</em>
                        </label>
                    </div>
                </div>
                
                <button (click)="createGroup()" style="background: #0d6efd;">Publish Group</button>
              </div>
          </div>
        </section>
      </div>

      <!-- Active Group Chat Section -->
      <section class="card" *ngIf="chatGroupService.activeGroup() as activeGroup">
        <div class="flex-between" style="border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 15px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <h2 style="margin: 0;">Chat: {{activeGroup.name}}</h2>
                <span style="background: #007bff; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">{{messageService.messages().length}} messages</span>
                <button (click)="messageService.fetchMessagesByGroup(activeGroup.id!)" style="padding: 2px 10px; font-size: 0.7rem; background: #6c757d;">Manual Refresh</button>
            </div>
            <button (click)="leaveGroup()" class="danger">Leave</button>
        </div>

        <div style="display: flex; gap: 20px;">
        
          <!-- Main Chat Feed (Left Side) -->
          <div style="flex: 2; display: flex; flex-direction: column;">
          
            <!-- Search Bar -->
            <div style="margin-bottom: 10px;">
              <input [(ngModel)]="searchQuery" placeholder="Search this conversation..." style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; background: white;" />
            </div>

            <div class="chat-box" style="flex: 1; height: 350px;">
              <div *ngFor="let msg of filteredMessages" class="message-bubble" [style.border]="$any(msg).isDistressed ? '2px solid #c53030' : 'none'" [style.background]="$any(msg).isDistressed ? '#fff5f5' : '#e9ecef'">
                <div *ngIf="$any(msg).isDistressed" style="color: #c53030; font-size: 0.7rem; font-weight: bold; margin-bottom: 3px;">⚠️ CAREGIVER ALERT</div>
                <strong>User {{msg.sender?.id || 'Unknown'}}:</strong> {{msg.content}}
                <!-- Inline Message Media Rendering -->
                <div *ngIf="msg.mediaUrl" style="margin-top: 5px;">
                  <img *ngIf="msg.mimeType?.startsWith('image/')" [src]="'http://localhost:8080' + msg.mediaUrl" style="max-width: 100%; border-radius: 8px;" />
                  <video *ngIf="msg.mimeType?.startsWith('video/')" [src]="'http://localhost:8080' + msg.mediaUrl" controls style="max-width: 100%; border-radius: 8px;"></video>
                  <a *ngIf="!msg.mimeType?.startsWith('image/') && !msg.mimeType?.startsWith('video/')" [href]="'http://localhost:8080' + msg.mediaUrl" target="_blank">Attachment</a>
                </div>
              </div>
              <div *ngIf="messageService.messages().length === 0" style="text-align:center; color:#888; margin-top: 20px;">No messages yet. Say hello!</div>
            </div>

            <div class="form-group row" style="margin-top: 15px; align-items: center;">
              <input type="file" (change)="onMessageFileSelected($event)" style="max-width: 250px;" />
              <input [(ngModel)]="newGroupMessage" placeholder="Type a message..." (keyup.enter)="sendGroupMessage(activeGroup.id!)" style="flex: 1;" />
              <button (click)="sendGroupMessage(activeGroup.id!)">Send</button>
            </div>
          </div>
          
          <!-- Chat Info Panel (Right Side) -->
          <div style="flex: 1; border-left: 1px solid #eee; padding-left: 15px;">
            <h3 style="margin-top:0; font-size: 1.1rem; border-bottom: 2px solid #ddd; padding-bottom: 5px;">Group Info</h3>
            
            <h4 style="margin-bottom: 5px; color:#555;">Members ({{activeGroup.members?.length || 0}})</h4>
            <div style="max-height: 100px; overflow-y: auto; font-size: 0.9rem; color: #333; margin-bottom: 15px;">
              <div *ngFor="let member of activeGroup.members" style="padding: 2px 0;">
                <span style="display:inline-block; width:8px; height:8px; background:#28a745; border-radius:50%; margin-right:5px;"></span> User ID: {{member.id}}
              </div>
              <div *ngIf="!activeGroup.members || activeGroup.members.length === 0">No members assigned.</div>
            </div>
            
            <h4 style="margin-bottom: 5px; color:#555;">Shared Media</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; max-height: 200px; overflow-y: auto; padding-top: 5px;">
              <ng-container *ngFor="let msg of messageService.messages()">
                <div *ngIf="msg.mediaUrl" style="border: 1px solid #ddd; border-radius: 4px; padding: 2px; background: white;">
                    <img *ngIf="msg.mimeType?.startsWith('image/')" [src]="'http://localhost:8080' + msg.mediaUrl" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" title="{{msg.sentAt | date:'short'}}" />
                    <a *ngIf="!msg.mimeType?.startsWith('image/')" [href]="'http://localhost:8080' + msg.mediaUrl" target="_blank" style="display:flex; width:50px; height:50px; align-items:center; justify-content:center; background:#eee; font-size:0.7rem; text-decoration:none; color:#333; overflow:hidden;">
                        File
                    </a>
                </div>
              </ng-container>
            </div>
          </div>
          
        </div>
      </section>
    </div>
  `,
  styles: [`
    .test-container { max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif; gap: 20px; display: flex; flex-direction: column; }
    h1 { color: #2c3e50; text-align: center; }
    .card { background: #f8f9fa; border-radius: 8px; padding: 20px; border: 1px solid #dee2e6; }
    .form-group { margin-bottom: 15px; display: flex; flex-direction: column; gap: 10px; }
    .form-group.row { flex-direction: row; }
    textarea, input { padding: 10px; border-radius: 4px; border: 1px solid #ccc; width: 100%; box-sizing: border-box;}
    button { background: #007bff; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; white-space: nowrap;}
    button:hover { background: #0056b3; }
    button.danger { background: #dc3545; }
    button.danger:hover { background: #c82333; }
    .list-item { background: white; padding: 10px; border-radius: 4px; margin-bottom: 5px; border: 1px solid #eee; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .chat-box { background: white; height: 300px; overflow-y: auto; padding: 15px; border: 1px solid #ddd; border-radius: 4px; display: flex; flex-direction: column; gap: 10px;}
    .message-bubble { background: #e9ecef; padding: 10px; border-radius: 15px; width: fit-content; max-width: 80%; }
  `]
})
export class CommunicationTestComponent implements OnInit {
  publicationService = inject(PublicationService);
  messageService = inject(MessageService);
  chatGroupService = inject(ChatGroupService);
  webSocketService = inject(WebSocketService);
  userService = inject(UserService);
  commentService = inject(CommentService);
  platformId = inject(PLATFORM_ID);
  
  currentUserId: number = 1;
  newPubContent = '';
  newPubType = 'EXPERIENCE';
  selectedFile: File | null = null;
  selectedMessageFile: File | null = null;
  
  newGroupName = '';
  newGroupDesc = '';
  newGroupTheme = 'SUPPORT';
  selectedUserIds: number[] = [];
  
  newGroupMessage = '';
  searchQuery = '';
  newCommentContent: { [key: number]: string } = {};

  constructor() {
    // Listen for real-time WebSocket messages and append them instantly
    effect(() => {
      const newMsg = this.webSocketService.realtimeMessage();
      if (newMsg) {
        const currentMsgs = this.messageService.messages();
        // Prevent duplicate appending if the HTTP fetch already grabbed it
        if (!currentMsgs.find(m => m.id === newMsg.id)) {
          console.log("DEBUG [WebSocket]: New message received. Distressed?", newMsg.isDistressed);
          this.messageService.messages.update(msgs => [...msgs, newMsg]);
        }
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    // Only attempt to fetch data if we are literally in the user's browser.
    // This prevents Angular's NodeJS SSR Server from crashing if the Spring Boot backend is offline/restarting.
    if (isPlatformBrowser(this.platformId)) {
        this.publicationService.fetchPublications();
        this.chatGroupService.fetchGroups();
        this.userService.fetchUsers();
    }
  }

  get filteredMessages() {
    const msgs = this.messageService.messages();
    if (!this.searchQuery.trim()) {
      return msgs;
    }
    const q = this.searchQuery.toLowerCase();
    return msgs.filter(m => m.content?.toLowerCase().includes(q));
  }

  toggleUserSelection(id: number, event: any) {
    if (event.target.checked) {
      if (!this.selectedUserIds.includes(id)) {
          this.selectedUserIds.push(id);
      }
    } else {
      this.selectedUserIds = this.selectedUserIds.filter(userId => userId !== id);
    }
  }

  isMemberOf(group: ChatGroup): boolean {
    if (!group.members) return false;
    return group.members.some(m => m.id === this.currentUserId);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  onMessageFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedMessageFile = file;
    }
  }

  submitPublication() {
    if (!this.newPubContent.trim() || !this.currentUserId) return;
    
    const formData = new FormData();
    formData.append('content', this.newPubContent);
    formData.append('authorId', this.currentUserId.toString());
    formData.append('type', this.newPubType);
    
    if (this.selectedFile) {
        formData.append('file', this.selectedFile);
    }
    
    this.publicationService.createPublication(formData);
    
    this.newPubContent = '';
    this.selectedFile = null;
  }

  createGroup() {
    if (!this.newGroupName.trim()) return;
    
    // Map the selected checkbox IDs directly into User ID objects
    const members = this.selectedUserIds.map(id => ({ id }));
    
    this.chatGroupService.createGroup({ 
        name: this.newGroupName, 
        description: this.newGroupDesc,
        theme: this.newGroupTheme,
        members: members
    });
    
    // Reset the form
    this.newGroupName = '';
    this.newGroupDesc = '';
    this.newGroupTheme = 'SUPPORT';
    this.selectedUserIds = [];
  }

  enterGroup(group: ChatGroup) {
    this.chatGroupService.setActiveGroup(group);
    this.messageService.fetchMessagesByGroup(group.id!);
    // Subscribe to STOMP channel for this specific group
    this.webSocketService.subscribeToGroup(group.id!);
  }

  leaveGroup() {
    this.chatGroupService.setActiveGroup(null);
    this.webSocketService.unsubscribe();
  }

  sendGroupMessage(groupId: number) {
    if((!this.newGroupMessage.trim() && !this.selectedMessageFile) || !this.currentUserId) return;
    
    const formData = new FormData();
    formData.append('content', this.newGroupMessage);
    formData.append('senderId', this.currentUserId.toString());
    formData.append('chatGroupId', groupId.toString());
    
    if (this.selectedMessageFile) {
        formData.append('file', this.selectedMessageFile);
    }
    
    this.messageService.createMessage(formData, groupId);
    
    this.newGroupMessage = '';
    this.selectedMessageFile = null;
  }

  submitComment(pubId: number) {
    const content = this.newCommentContent[pubId];
    if (!content || !content.trim() || !this.currentUserId) return;

    const comment: Comment = {
      content: content,
      author: { id: this.currentUserId },
      publication: { id: pubId }
    };

    this.commentService.createComment(comment).subscribe(() => {
      this.publicationService.fetchPublications(); // Refresh to show new comment
      this.newCommentContent[pubId] = '';
    });
  }
}
