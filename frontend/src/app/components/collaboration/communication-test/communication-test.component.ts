// Collaborative Communication Component - Module 8
import { Component, inject, OnInit, effect, PLATFORM_ID, computed, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicationService, PublicationDto, PublicationCreateRequest } from '../../../services/collaboration/publication.service';
import { MessageService, MessageDto, MessageCreateRequest } from '../../../services/collaboration/message.service';
import { ChatGroupService, ChatGroupDto, ChatGroupCreateRequest } from '../../../services/collaboration/chat-group.service';
import { WebSocketService } from '../../../services/collaboration/websocket.service';
import { UserService } from '../../../services/user.service';
import { NotificationService, Notification } from '../../../services/collaboration/notification.service';
import { CommentService, CommentCreateRequest } from '../../../services/collaboration/comment.service';

@Component({
  selector: 'app-communication-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="test-container">
      <h1>Module 8: Collaborative Communication</h1>

      <!-- User Simulator (Simplified) -->
      <section class="card" style="background: #e3f2fd; border-color: #b6d4fe; display: flex; align-items: center; justify-content: center; gap: 15px;">
          <label style="font-weight: bold;">Simulate User ID:</label>
          <input type="number" [ngModel]="currentUserId()" (ngModelChange)="onUserChange($event)" style="max-width: 80px; text-align: center;" />
      </section>

      <!-- Notification Center -->
      <section class="card" *ngIf="notificationService.notifications().length > 0" style="background: #fff9db; border-color: #fab005;">
        <div class="flex-between">
            <h3 style="margin: 0;">🔔 Notifications ({{notificationService.unreadCount()}} unread)</h3>
            <button (click)="notificationService.notifications.set([])" style="background: transparent; color: #666; font-size: 0.8rem; text-decoration: underline; padding: 0;">Clear All</button>
        </div>
        <div style="max-height: 120px; overflow-y: auto; margin-top: 10px;">
            <div *ngFor="let n of notificationService.notifications()" 
                 [style.background]="n.isRead ? 'transparent' : '#fff3bf'"
                 style="padding: 8px; border-radius: 6px; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #ffe066;">
                <span>{{n.content}}</span>
                <div style="display:flex; gap:5px;">
                    <button *ngIf="!n.isRead" (click)="notificationService.markAsRead(n.id!)" style="font-size: 0.7rem; padding: 2px 5px; background: #fab005;">Mark Read</button>
                    <button (click)="deleteNotification(n.id!)" style="font-size: 0.7rem; padding: 2px 5px; background: #fa5252; color: white;">Delete</button>
                </div>
            </div>
        </div>
      </section>

      <!-- Dashboard (Visible when no chat is active) -->
      <div *ngIf="!chatGroupService.activeGroup()" style="display: flex; gap: 20px;">
      
        <!-- LEFT COLUMN: Global Feed -->
        <section class="card" style="flex: 2;">
          <h2>Global Feed</h2>
          
          <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 20px;">
            <div class="form-group row" style="display: flex; gap: 15px; align-items: center;">
                <select [(ngModel)]="newPubType" style="padding: 10px; border-radius: 4px; border: 1px solid #ccc; max-width: 150px;">
                    <option value="EXPERIENCE">Experience</option>
                    <option value="TEMOIGNAGE">Témoignage</option>
                    <option value="ANNOUNCEMENT">Announcement</option>
                </select>
                <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 0.9rem;">
                    <input type="checkbox" [(ngModel)]="newPubAnonymous" /> Post Anonymously
                </label>
            </div>
            <div class="form-group">
              <textarea [(ngModel)]="newPubContent" 
                        #pubInput="ngModel"
                        required 
                        maxlength="5000"
                        placeholder="Post an update to the global feed..." 
                        style="height: 80px;"></textarea>
              <div style="font-size: 0.75rem; color: #888; text-align: right; margin-top: 5px;">
                {{newPubContent.length}}/5000
              </div>
              <div class="flex-between" style="margin-top: 10px;">
                  <input type="file" (change)="onFileSelected($event)" accept="image/*,video/*,application/pdf" />
                  <button (click)="submitPublication()" 
                          [disabled]="!newPubContent.trim() || newPubContent.length > 5000"
                          [style.opacity]="(!newPubContent.trim() || newPubContent.length > 5000) ? '0.5' : '1'">
                    Post Publication
                  </button>
              </div>
            </div>
          </div>
          
          <div *ngFor="let pub of publicationService.publications()" class="list-item" style="margin-top: 15px; padding: 15px;">
            <div class="flex-between">
                <strong><span style="display:inline-block; width:25px; height:25px; background:#0d6efd; color:white; border-radius:50%; text-align:center; line-height:25px; margin-right:5px;">U</span> User {{pub.authorId || 'Unknown'}}</strong>
                <div style="display:flex; gap: 10px; align-items: center;">
                    <span style="background: #e9ecef; padding: 3px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; color: #555;">{{pub.type}}</span>
                    <button *ngIf="pub.authorId === currentUserId()" (click)="startEdit(pub.id!, 'PUBLICATION', pub.content)" style="padding: 2px 5px; font-size: 0.7rem; background: #ffc107; color: black;">Edit</button>
                    <button *ngIf="pub.authorId === currentUserId()" (click)="deleteItem(pub.id!, 'PUBLICATION')" style="padding: 2px 5px; font-size: 0.7rem;" class="danger">Del</button>
                </div>
            </div>
            
            <div *ngIf="$any(pub).isDistressed" style="background: #fff5f5; border: 1px solid #feb2b2; color: #c53030; padding: 8px; border-radius: 6px; margin: 10px 0; font-weight: bold; font-size: 0.9rem; display: flex; flex-direction: column; gap: 5px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background: #c53030; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">!</span>
                    Caregiver Alert: This post shows signs of worry or distress.
                </div>
                <div style="font-size: 0.7rem; color: #e53e3e; margin-left: 28px;">
                    Mental Health Score: {{ $any(pub).sentimentScore | number:'1.2-2' }} (Critical < -0.5)
                </div>
            </div>

            <p *ngIf="editingItemId !== pub.id || editingItemType !== 'PUBLICATION'" style="margin: 15px 0; font-size: 1.05rem; line-height: 1.4;">{{pub.content}}</p>
            <div *ngIf="editingItemId === pub.id && editingItemType === 'PUBLICATION'" style="margin: 15px 0;">
                <div class="form-group row" style="margin-bottom: 5px; display: flex; gap: 15px; align-items: center;">
                    <select [(ngModel)]="editingType" style="padding: 5px; border-radius: 4px; border: 1px solid #ccc; font-size: 0.8rem; width: auto;">
                        <option value="EXPERIENCE">Experience</option>
                        <option value="TEMOIGNAGE">Témoignage</option>
                        <option value="ANNOUNCEMENT">Announcement</option>
                    </select>
                    <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 0.8rem;">
                        <input type="checkbox" [(ngModel)]="editingAnonymous" /> Anonymous
                    </label>
                </div>
                <textarea [(ngModel)]="editingContent" style="width:100%; height:80px; margin-bottom: 5px; font-family: inherit; padding: 8px;"></textarea>
                <div style="margin-bottom: 10px; font-size: 0.85rem; color: #555;">
                    <label style="font-weight:bold;">Replace Attached Media (optional):</label>
                    <input type="file" (change)="onFileSelected($event)" accept="image/*,video/*,application/pdf" style="display: block; margin-top: 5px; padding: 5px; border: 1px dashed #ccc; width: 100%; border-radius: 4px;" />
                </div>
                <div style="display:flex; gap: 5px;">
                  <button (click)="saveEdit()" style="padding: 5px 10px; font-size: 0.8rem;">Save</button>
                  <button (click)="cancelEdit()" style="padding: 5px 10px; font-size: 0.8rem; background: #6c757d;">Cancel</button>
                </div>
            </div>
            
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
                    <div class="flex-between">
                        <div>
                            <strong>User {{comment.authorId}}:</strong> 
                            <span *ngIf="editingItemId !== comment.id || editingItemType !== 'COMMENT'">{{comment.content}}</span>
                        </div>
                        <div *ngIf="comment.authorId === currentUserId()" style="display:flex; gap: 5px;">
                            <button (click)="startEdit(comment.id, 'COMMENT', comment.content)" style="padding: 2px 5px; font-size: 0.6rem; background: #ffc107; color: black;">Edit</button>
                            <button (click)="deleteItem(comment.id, 'COMMENT')" style="padding: 2px 5px; font-size: 0.6rem;" class="danger">Del</button>
                        </div>
                    </div>
                    
                    <div *ngIf="editingItemId === comment.id && editingItemType === 'COMMENT'" style="margin-top: 5px;">
                        <input [(ngModel)]="editingContent" style="width:100%; padding: 5px; font-size: 0.8rem; margin-bottom: 5px; border-radius: 4px; border: 1px solid #ccc;" />
                        <div style="display:flex; gap: 5px;">
                          <button (click)="saveEdit()" style="padding: 2px 8px; font-size: 0.7rem;">Save</button>
                          <button (click)="cancelEdit()" style="padding: 2px 8px; font-size: 0.7rem; background: #6c757d;">Cancel</button>
                        </div>
                    </div>
                    <div style="font-size: 0.75rem; color: #999; margin-top: 3px;">{{comment.createdAt | date:'short'}}</div>
                </div>

                <!-- Add Comment Form -->
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <input type="text" 
                           [(ngModel)]="newCommentContent[pub.id!]" 
                           maxlength="1000"
                           placeholder="Add a comment..." 
                           style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem;">
                    <button (click)="submitComment(pub.id!)" 
                            [disabled]="!newCommentContent[pub.id!] || !newCommentContent[pub.id!].trim()"
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
            <div class="flex-between">
                <div style="flex: 1;">
                     <strong *ngIf="editingItemId !== grp.id || editingItemType !== 'GROUP'" style="font-size: 1.1rem; display: block;">{{grp.name}}</strong>
                     <div *ngIf="editingItemId === grp.id && editingItemType === 'GROUP'">
                         <input [(ngModel)]="editingContent" placeholder="New Group Name" style="font-size: 1rem; width: 100%; margin-bottom: 5px; padding: 4px;" />
                         <input [(ngModel)]="editingDesc" placeholder="New Description" style="font-size: 0.8rem; width: 100%; margin-bottom: 5px; padding: 4px;" />
                         <select [(ngModel)]="editingTheme" style="font-size: 0.8rem; padding: 4px; border-radius: 4px; border: 1px solid #ccc; width: 100%;">
                            <option value="SUPPORT">Medical Support</option>
                            <option value="SOCIAL">Social / Hobbies</option>
                            <option value="REGIONAL">Regional Meetups</option>
                         </select>
                     </div>
                </div>
                <div style="display:flex; gap: 5px;">
                    <button *ngIf="editingItemId !== grp.id || editingItemType !== 'GROUP'" (click)="startGroupEdit(grp)" style="padding: 2px 5px; font-size: 0.7rem; background: #ffc107; color: black;">Edit</button>
                    <button *ngIf="editingItemId !== grp.id || editingItemType !== 'GROUP'" (click)="deleteItem(grp.id!, 'GROUP')" style="padding: 2px 5px; font-size: 0.7rem;" class="danger">Del</button>
                    
                    <button *ngIf="editingItemId === grp.id && editingItemType === 'GROUP'" (click)="saveEdit()" style="padding: 2px 5px; font-size: 0.7rem;">Save</button>
                    <button *ngIf="editingItemId === grp.id && editingItemType === 'GROUP'" (click)="cancelEdit()" style="padding: 2px 5px; font-size: 0.7rem; background: #6c757d;">Cancel</button>
                </div>
            </div>
            <span style="font-size: 0.9rem; color: #666; display: block; margin-top: 3px;">{{grp.description}}</span>
            
            <div class="flex-between">
                <span *ngIf="grp.theme" style="background: #e3f2fd; color: #0d6efd; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">{{grp.theme}}</span>
                <span style="font-size:0.8rem; color:#888;">{{grp.members.length || 0}} Members</span>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 5px 0;" />
            
            <!-- Conditionally Render Join vs Enter -->
            <ng-container *ngIf="isMemberOf(grp)">
                <button (click)="enterGroup(grp)" style="background: #28a745; width: 100%;">Enter Chat</button>
            </ng-container>
            <ng-container *ngIf="!isMemberOf(grp)">
                <button (click)="chatGroupService.joinGroup(grp.id!, currentUserId())" style="background: #ffc107; color: #000; width: 100%; font-weight: bold;">+ Join Group</button>
            </ng-container>
          </div>

          <!-- Create Group Collapsible/Area -->
          <div style="margin-top: 30px; border-top: 2px dashed #ccc; padding-top: 15px;">
              <h3 style="margin-top: 0; font-size: 1.1rem;">Create a New Group</h3>
              <div class="form-group">
                <input [(ngModel)]="newGroupName" maxlength="50" placeholder="Group Name (min 3 chars)" />
                <input [(ngModel)]="newGroupDesc" maxlength="255" placeholder="Short Description..." />
                <select [(ngModel)]="newGroupTheme" style="padding: 10px; border-radius: 4px; border: 1px solid #ccc;">
                  <option value="SUPPORT">Medical Support</option>
                  <option value="SOCIAL">Social / Hobbies</option>
                  <option value="REGIONAL">Regional Meetups</option>
                </select>


                
                <div class="user-picker" style="max-height: 100px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; border-radius: 4px; background: white;">
                    <div style="font-size: 0.8rem; font-weight: bold; color: #555; margin-bottom: 5px;">Invite Members:</div>
                    <div *ngFor="let u of userService.users()" style="margin-bottom: 2px; display: flex; justify-content: space-between; align-items: center;">
                        <label style="font-size: 0.9rem; cursor: pointer; flex: 1;">
                            <input type="checkbox" [value]="u.id" [checked]="selectedUserIds.includes(u.id)" (change)="toggleUserSelection(u.id!, $event)">
                            {{u.name}} <em style="font-size:0.7rem;">(ID: {{u.id}})</em>
                        </label>
                        <button *ngIf="u.id !== currentUserId()" 
                                (click)="openDmChat(u.id!)" 
                                style="padding: 2px 6px; font-size: 0.7rem; background: #fa8c16; color: white; border: none; border-radius: 3px; margin-left: 5px;">
                            Chat
                        </button>
                    </div>
                </div>
                
                <button (click)="createGroup()" 
                        [disabled]="newGroupName.trim().length < 3 || newGroupName.length > 50"
                        [style.opacity]="(newGroupName.trim().length < 3) ? '0.5' : '1'"
                        style="background: #0d6efd;">
                    Publish Group
                </button>
              </div>
          </div>
 
          <!-- Direct Messages Section -->
          <div style="margin-top: 30px; border-top: 2px solid #000; padding-top: 15px; background: #f8f9fa; padding: 10px; border-radius: 8px; border: 1px solid #ddd;">
              <h3 style="margin-top: 0; font-size: 1.1rem;">💬 Direct Messages</h3>
              
              <!-- User Search -->
              <div style="margin-bottom: 15px;">
                <input [(ngModel)]="dmUserSearch" 
                       placeholder="Search users..." 
                       style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ccc; background: white;" />
              </div>

              <!-- Users List -->
              <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; background: white; padding: 10px;">
                  <div *ngFor="let user of filteredDmUsers" 
                       style="padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
                       (click)="openDmChat(user.id!)"
                       [style.background]="activeDmUserId === user.id ? '#e3f2fd' : 'transparent'"
                       [style.color]="activeDmUserId === user.id ? 'white' : 'black'">
                      <div style="display: flex; align-items: center; gap: 10px;">
                          <div style="width: 30px; height: 30px; background: #007bff; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">
                              {{user.name?.charAt(0) || 'U'}}
                          </div>
                          <div>
                              <div style="font-weight: bold;">{{user.name}}</div>
                              <div style="font-size: 0.8rem; color: #666;">User ID: {{user.id}}</div>
                          </div>
                      </div>
                      <div style="font-size: 0.8rem; color: #666;">
                          <span *ngIf="activeDmUserId === user.id" style="color: #007bff;">● Active</span>
                          <span *ngIf="activeDmUserId !== user.id">Click to chat</span>
                      </div>
                  </div>
              </div>
          </div>

          <!-- Active DM Chat Section -->
          <div *ngIf="activeDmUserId" style="margin-top: 20px; border: 2px solid #fa8c16; padding: 15px; border-radius: 8px; background: #fff;">
              <div class="flex-between" style="border-bottom: 2px solid #ffe58f; padding-bottom: 10px; margin-bottom: 15px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                      <h3 style="margin: 0; color: #fa8c16;">DM Chat</h3>
                      <span style="background: #fa8c16; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">
                        {{dmUserName}}
                      </span>
                      <span style="background: #007bff; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">{{dmMessages().length}} messages</span>
                  </div>
                  <button (click)="closeDmChat()" class="danger" style="padding: 2px 8px; font-size: 0.8rem;">Close</button>
              </div>

              <div class="chat-box" style="height: 250px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 8px; padding: 10px; background: #f8f9fa;">
                  <div *ngFor="let msg of dmMessages()" class="message-bubble" 
                       [style.background]="msg.senderId === currentUserId() ? '#007bff' : '#e9ecef'"
                       [style.color]="msg.senderId === currentUserId() ? 'white' : 'black'"
                       [style.margin-left]="msg.senderId === currentUserId() ? 'auto' : '0'"
                       [style.margin-right]="msg.senderId === currentUserId() ? '0' : 'auto'"
                       style="margin-bottom: 10px; max-width: 80%;">
                      <div *ngIf="msg.distressed" style="color: #c53030; font-size: 0.7rem; font-weight: bold; margin-bottom: 3px;">⚠️ CAREGIVER ALERT</div>
                      <strong>User {{msg.senderId}}:</strong> {{msg.content}}
                      <div style="font-size: 0.7rem; opacity: 0.7; margin-top: 3px;">{{msg.sentAt | date:'short'}}</div>
                  </div>
              </div>

              <div class="form-group" style="display: flex; gap: 10px;">
                  <input [(ngModel)]="dmContent" 
                         placeholder="Type your message..." 
                         style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid #ccc;"
                         (keyup.enter)="sendDmMessage()" />
                  <button (click)="sendDmMessage()" 
                          [disabled]="!dmContent.trim()" 
                          style="background: #fa8c16; color: white; padding: 8px 15px; border: none; border-radius: 4px;">
                      Send
                  </button>
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

            <div class="chat-box" style="flex: 1; height: 350px; background: #fff; padding: 20px;">
              <div *ngFor="let msg of filteredMessages" 
                   style="display: flex; gap: 8px; margin-bottom: 12px; width: 100%;"
                   [style.flex-direction]="msg.senderId === currentUserId() ? 'row-reverse' : 'row'">
                   
                <!-- Avatar for other users -->
                <div *ngIf="msg.senderId !== currentUserId()" 
                     style="width: 28px; height: 28px; border-radius: 50%; background: #dee2e6; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: bold; flex-shrink: 0; align-self: flex-end;">
                  {{ msg.senderName ? msg.senderName.substring(0,1) : 'U' }}
                </div>
 
                <div class="message-bubble" 
                     [style.align-self]="msg.senderId === currentUserId() ? 'flex-end' : 'flex-start'"
                     [style.border]="$any(msg).isDistressed ? '2px solid #c53030' : 'none'" 
                     [style.background]="msg.senderId === currentUserId() ? '#007bff' : ($any(msg).isDistressed ? '#fff5f5' : '#e9ecef')"
                     [style.color]="msg.senderId === currentUserId() ? 'white' : 'black'"
                     [style.box-shadow]="'0 1px 2px rgba(0,0,0,0.1)'"
                     style="padding: 8px 12px; border-radius: 18px; position: relative;">
                <div *ngIf="$any(msg).isDistressed" style="color: #c53030; font-size: 0.7rem; font-weight: bold; margin-bottom: 3px;">⚠️ CAREGIVER ALERT</div>
                
                <!-- Reply Preview inside bubble -->
                <div *ngIf="msg.parentMessageId" style="background: rgba(0,0,0,0.1); border-left: 3px solid rgba(0,0,0,0.3); padding: 5px 8px; font-size: 0.75rem; margin-bottom: 5px; border-radius: 8px;">
                    <div style="font-weight:bold; opacity: 0.8;">{{msg.parentMessageSenderName}}</div>
                    <div style="opacity: 0.9; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{msg.parentMessageContent}}</div>
                </div>
 
                <div class="flex-between" style="gap: 15px; align-items: flex-start;">
                    <div>
                        <div *ngIf="msg.senderId !== currentUserId()" style="font-weight: bold; font-size: 0.7rem; opacity: 0.7; margin-bottom: 2px;">{{msg.senderName}}</div>
                        <span *ngIf="editingItemId !== msg.id || editingItemType !== 'MESSAGE'">{{msg.content}}</span>
                    </div>
                    <div style="display:flex; gap: 4px; opacity: 0.6;" class="bubble-actions">
                        <button (click)="setReply(msg)" style="padding: 2px 4px; font-size: 0.6rem; background: transparent; color: inherit; border: none; cursor: pointer;" title="Reply">↩️</button>
                        <button *ngIf="msg.senderId === currentUserId()" (click)="startEdit(msg.id, 'MESSAGE', msg.content)" style="padding: 2px 4px; font-size: 0.6rem; background: transparent; color: inherit; border: none; cursor: pointer;" title="Edit">✏️</button>
                        <button *ngIf="msg.senderId === currentUserId()" (click)="deleteItem(msg.id, 'MESSAGE')" style="padding: 2px 4px; font-size: 0.6rem; background: transparent; color: inherit; border: none; cursor: pointer;" title="Delete">🗑️</button>
                    </div>
                </div>

                <div *ngIf="editingItemId === msg.id && editingItemType === 'MESSAGE'" style="margin-top: 5px;">
                    <input [(ngModel)]="editingContent" style="width:100%; padding: 4px; font-size: 0.8rem; margin-bottom: 5px; border-radius: 4px; border: 1px solid #ccc;" />
                    <div style="margin-bottom: 5px; font-size: 0.75rem; color: #555;">
                        <label style="font-weight:bold;">Replace Media (optional):</label>
                        <input type="file" (change)="onMessageFileSelected($event)" style="display: block; margin-top: 3px; padding: 3px; border: 1px dashed #ccc; width: 100%; border-radius: 3px;" />
                    </div>
                    <div style="display:flex; gap: 5px;">
                        <button (click)="saveEdit()" style="padding: 2px 8px; font-size: 0.7rem;">Save</button>
                        <button (click)="cancelEdit()" style="padding: 2px 8px; font-size: 0.7rem; background: #6c757d;">Cancel</button>
                    </div>
                </div>
                <!-- Inline Message Media Rendering -->
                <div *ngIf="msg.mediaUrl" style="margin-top: 5px;">
                  <img *ngIf="msg.mimeType?.startsWith('image/')" [src]="'http://localhost:8080' + msg.mediaUrl" style="max-width: 100%; border-radius: 8px;" />
                  <video *ngIf="msg.mimeType?.startsWith('video/')" [src]="'http://localhost:8080' + msg.mediaUrl" controls style="max-width: 100%; border-radius: 8px;"></video>
                  <a *ngIf="!msg.mimeType?.startsWith('image/') && !msg.mimeType?.startsWith('video/')" [href]="'http://localhost:8080' + msg.mediaUrl" target="_blank">Attachment</a>
                </div>
              </div>
            </div>
              <div *ngIf="messageService.messages().length === 0" style="text-align:center; color:#888; margin-top: 20px;">No messages yet. Say hello!</div>
            </div>

            <!-- Message input area -->
            <div *ngIf="replyingTo" style="background: #f1f3f5; border-left: 4px solid #007bff; padding: 8px 12px; margin-bottom: 5px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 0.85rem; color: #495057;">
                    <strong>Replying to {{replyingTo.senderName}}:</strong> 
                    <span style="display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 400px; font-style: italic;">"{{replyingTo.content}}"</span>
                </div>
                <button (click)="cancelReply()" style="background: transparent; color: #666; padding: 4px; border: none; font-size: 1.2rem; line-height: 1; cursor: pointer;">&times;</button>
            </div>
 
            <div class="form-group row" style="margin-top: 15px; align-items: center;">
              <input type="file" (change)="onMessageFileSelected($event)" style="max-width: 250px;" />
              <input [(ngModel)]="newGroupMessage" 
                     maxlength="2000"
                     placeholder="Type a message..." 
                     (keyup.enter)="sendGroupMessage(activeGroup.id!)" 
                     style="flex: 1;" />
            <button (click)="sendGroupMessage(activeGroup.id!)"
                    [disabled]="!newGroupMessage.trim() && !selectedMessageFile">
              Send
            </button>
            <div style="font-size: 0.7rem; color: #888; margin-top: 5px;">
                Tip: Type <strong>"lost help sad"</strong> to trigger CareBot support.
            </div>
          </div>
        </div>
          
          <!-- Chat Info Panel (Right Side) -->
          <div style="flex: 1; border-left: 1px solid #eee; padding-left: 15px;">
            <h3 style="margin-top:0; font-size: 1.1rem; border-bottom: 2px solid #ddd; padding-bottom: 5px;">Group Info</h3>
            
            <h4 style="margin-bottom: 5px; color:#555;">Members ({{activeGroup.members.length || 0}})</h4>
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

      <!-- CareBot Reassurance Panel (Floating or Side Section) -->
      <section class="card" *ngIf="botMessages().length > 0" style="border-left: 4px solid #28a745; background: #f0fff4;">
        <h3 style="margin-top: 0; display: flex; align-items: center; gap: 10px;">
            🤖 CareBot Support 
            <span style="font-size: 0.7rem; background: #28a745; color: white; padding: 2px 8px; border-radius: 10px;">Private</span>
        </h3>
        <div *ngFor="let botMsg of botMessages()" style="background: white; padding: 10px; border-radius: 8px; border: 1px solid #c6f6d5; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="font-weight: bold; color: #2f855a; font-size: 0.8rem; margin-bottom: 5px;">CareBot • {{ botMsg.sentAt | date:'shortTime' }}</div>
            {{ botMsg.content }}
        </div>
        <button (click)="botMessages.set([])" style="background: transparent; color: #666; font-size: 0.8rem; text-decoration: underline; padding: 0;">Clear history</button>
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
  
  currentUserId = signal<number>(1);
  newPubContent = '';
  newPubType = 'EXPERIENCE';
  newPubAnonymous = false;
  selectedFile: File | null = null;
  selectedMessageFile: File | null = null;
  
  newGroupName = '';
  newGroupDesc = '';
  newGroupTheme = 'SUPPORT';
  selectedUserIds: number[] = [];
  
  newGroupMessage = '';
  searchQuery = '';
  newCommentContent: { [key: number]: string } = {};
  botMessages = signal<MessageDto[]>([]);
  replyingTo: MessageDto | null = null;
  
  editingItemId: number | null = null;
  editingItemType: 'PUBLICATION' | 'COMMENT' | 'MESSAGE' | 'GROUP' | null = null;
  editingContent: string = '';
  editingType: string = 'EXPERIENCE';
  editingDesc: string = '';
  editingTheme: string = 'SUPPORT';
  editingAnonymous: boolean = false;
 
  dmReceiverId: number | null = null;
  dmContent: string = '';
  activeDmUserId: number | null = null;
  dmMessages = signal<MessageDto[]>([]);
  dmUserSearch: string = '';
  filteredDmUsers: any[] = [];
 
  notificationService = inject(NotificationService);

  constructor() {
    // Listen for real-time WebSocket messages and append/update/delete them instantly
    effect(() => {
      const newMsg = this.webSocketService.realtimeMessage();
      if (newMsg) {
        untracked(() => {
          // Handle deletion marker
          if (newMsg.content === '__DELETED__') {
              this.messageService.messages.update(msgs => msgs.filter(m => m.id !== newMsg.id));
              if (this.activeDmUserId) {
                  this.dmMessages.update(msgs => msgs.filter(m => m.id !== newMsg.id));
              }
              return;
          }

          const currentMsgs = this.messageService.messages();
          const existingIdx = currentMsgs.findIndex(m => m.id === newMsg.id);
          
          if (existingIdx === -1) {
            // New message
            console.log("DEBUG [WebSocket]: New message received. Distressed?", newMsg.distressed);
            this.messageService.messages.update(msgs => [...msgs, newMsg]);
            
            // If this is a DM message and we have an active DM chat, update it
            if ((newMsg.receiverId === this.currentUserId() || newMsg.senderId === this.currentUserId()) && 
                newMsg.receiverId && newMsg.senderId) {
              const otherUserId = newMsg.senderId === this.currentUserId() ? newMsg.receiverId : newMsg.senderId;
              if (this.activeDmUserId === otherUserId) {
                this.dmMessages.update(msgs => [...msgs, newMsg]);
              }
            }
          } else {
            // Update existing message
            console.log("DEBUG [WebSocket]: Message updated.", newMsg.id);
            this.messageService.messages.update(msgs => msgs.map(m => m.id === newMsg.id ? newMsg : m));
            if (this.activeDmUserId) {
                this.dmMessages.update(msgs => msgs.map(m => m.id === newMsg.id ? newMsg : m));
            }
          }
        });
      }
    }, { allowSignalWrites: true });

    // Listen for CareBot private messages
    effect(() => {
      const botMsg = this.webSocketService.carebotMessage();
      if (botMsg) {
        untracked(() => {
          console.log("CARE-BOT [UI]: Received reassurance!");
          this.botMessages.update(msgs => [botMsg, ...msgs]);
        });
      }
    }, { allowSignalWrites: true });

    // Listen for regular Notifications
    effect(() => {
        const notif = this.webSocketService.notificationMessage();
        if (notif) {
            untracked(() => {
              this.notificationService.addNotification(notif);
            });
        }
    }, { allowSignalWrites: true });

    // Sync WebSocket Identity when User ID changes
    effect(() => {
        const uid = this.currentUserId();
        if (uid) {
            untracked(() => {
                console.log("SIMULATOR: Syncing WebSocket for User " + uid);
                this.webSocketService.setUserId(uid);
                
                // Wait for connection before subscribing
                const sub = this.webSocketService.connected$.subscribe(connected => {
                    if (connected) {
                        this.webSocketService.subscribeToUser(uid);
                        if (this.chatGroupService.activeGroup()) {
                            this.webSocketService.subscribeToGroup(this.chatGroupService.activeGroup()!.id!);
                        }
                        sub.unsubscribe();
                    }
                });
            });
        }
    }, { allowSignalWrites: true });

    // Update filtered DM users when search or users change
    effect(() => {
        const users = this.userService.users();
        const uid = this.currentUserId();
        if (!this.dmUserSearch.trim()) {
            this.filteredDmUsers = users.filter(u => u.id !== uid);
        } else {
            const q = this.dmUserSearch.toLowerCase();
            this.filteredDmUsers = users.filter(u => 
                u.id !== uid &&
                (u.name?.toLowerCase().includes(q) || u.id.toString().includes(q))
            );
        }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
        this.refreshData();
        // WebSocket sync is handled by the effect() in the constructor
    }
  }

  onUserChange(newId: number) {
    this.currentUserId.set(newId);
    this.refreshData();
  }

  refreshData() {
    this.publicationService.fetchPublications();
    this.chatGroupService.fetchGroups();
    this.userService.fetchUsers();
    this.notificationService.fetchNotifications(this.currentUserId());
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
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

  isMemberOf(group: ChatGroupDto): boolean {
    if (!group.members) return false;
    return group.members.some((m: any) => m.id === this.currentUserId());
  }

  get filteredMessages() {
    const msgs = this.messageService.messages();
    if (!this.searchQuery.trim()) {
      return msgs;
    }
    const q = this.searchQuery.toLowerCase();
    return msgs.filter(m => m.content?.toLowerCase().includes(q));
  }

  get dmUserName(): string {
    if (!this.activeDmUserId) return '';
    const user = this.userService.users().find(u => u.id === this.activeDmUserId);
    return user?.name || `User ${this.activeDmUserId}`;
  }

  onMessageFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedMessageFile = file;
    }
  }

  submitPublication() {
    if (!this.newPubContent.trim() || !this.currentUserId()) return;
    
    const formData = new FormData();
    formData.append('content', this.newPubContent);
    formData.append('authorId', this.currentUserId().toString());
    formData.append('type', this.newPubType);
    
    if (this.selectedFile) {
        formData.append('file', this.selectedFile);
    }
    
    const req: PublicationCreateRequest = {
      content: this.newPubContent,
      authorId: this.currentUserId(),
      type: this.newPubType,
      anonymous: this.newPubAnonymous
    };
    
    this.publicationService.createPublication(req, this.selectedFile || undefined);
    
    this.newPubContent = '';
    this.newPubAnonymous = false;
    this.selectedFile = null;
  }

  createGroup() {
    if (!this.newGroupName.trim()) return;
    
    // Extract just the raw IDs to match ChatGroupCreateRequest
    const memberIds = this.selectedUserIds;
    
    this.chatGroupService.createGroup({ 
        name: this.newGroupName, 
        description: this.newGroupDesc,
        theme: this.newGroupTheme,
        ownerId: this.currentUserId(),
        memberIds: memberIds
    });
    
    // Reset the form
    this.newGroupName = '';
    this.newGroupDesc = '';
    this.newGroupTheme = 'SUPPORT';
    this.selectedUserIds = [];
  }

  enterGroup(group: ChatGroupDto) {
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
    if((!this.newGroupMessage.trim() && !this.selectedMessageFile) || !this.currentUserId()) return;
    
    const req: MessageCreateRequest = {
      content: this.newGroupMessage,
      senderId: this.currentUserId(),
      chatGroupId: groupId,
      parentMessageId: this.replyingTo?.id
    };
    
    this.messageService.createMessage(req, this.selectedMessageFile || undefined).subscribe(() => {
        this.cancelReply();
    });
    
    this.newGroupMessage = '';
    this.selectedMessageFile = null;
  }
 
  setReply(msg: MessageDto) {
    this.replyingTo = msg;
    // Focus input if possible or just scroll
  }
 
  cancelReply() {
    this.replyingTo = null;
  }

  submitComment(pubId: number) {
    const content = this.newCommentContent[pubId];
    if (!content || !content.trim() || !this.currentUserId()) return;

    const request: CommentCreateRequest = {
      content: content,
      authorId: this.currentUserId(),
      publicationId: pubId
    };

    this.commentService.createComment(request).subscribe(() => {
      this.publicationService.fetchPublications(); // Refresh to show new comment
      this.newCommentContent[pubId] = '';
    });
  }

  cancelEdit() {
    this.editingItemId = null;
    this.editingItemType = null;
    this.editingContent = '';
    this.selectedFile = null;
    this.selectedMessageFile = null;
  }

  saveEdit() {
    if (!this.editingItemId || !this.editingItemType || !this.editingContent.trim()) return;
 
    if (this.editingItemType === 'PUBLICATION') {
      const pub = this.publicationService.publications().find(p => p.id === this.editingItemId);
      if (pub) {
        const fd = new FormData();
        fd.append('content', this.editingContent);
        fd.append('type', this.editingType); 
        fd.append('authorId', pub.authorId.toString());
        
        if (this.selectedFile) {
            fd.append('file', this.selectedFile);
        }
        
      const req: PublicationCreateRequest = {
        content: this.editingContent,
        type: this.editingType,
        authorId: pub.authorId,
        anonymous: this.editingAnonymous
      };
      
      this.publicationService.updatePublication(this.editingItemId, req, this.selectedFile || undefined);
      }
    } else if (this.editingItemType === 'COMMENT') {
      let targetComment: any = null;
      let targetPubId: number | null = null;
      for (const pub of this.publicationService.publications()) {
          const c = pub.comments?.find(com => com.id === this.editingItemId);
          if (c) {
              targetComment = c;
              targetPubId = pub.id!;
              break;
          }
      }
      
      if (targetComment && targetPubId) {
          const req: CommentCreateRequest = {
              content: this.editingContent,
              authorId: targetComment.authorId,
              publicationId: targetPubId
          };
          this.commentService.updateComment(this.editingItemId, req).subscribe(() => {
              this.publicationService.fetchPublications();
          });
      }
    } else if (this.editingItemType === 'MESSAGE') {
      const fd = new FormData();
      fd.append('content', this.editingContent);
      fd.append('senderId', this.currentUserId().toString());
      if (this.chatGroupService.activeGroup()) {
         fd.append('chatGroupId', this.chatGroupService.activeGroup()!.id!.toString());
      }
      if (this.selectedMessageFile) {
         fd.append('file', this.selectedMessageFile);
      }
      const req: MessageCreateRequest = {
        content: this.editingContent,
        senderId: this.currentUserId()
      };
      
      if (this.chatGroupService.activeGroup()) {
         req.chatGroupId = this.chatGroupService.activeGroup()!.id!;
      }
      
      this.messageService.updateMessage(this.editingItemId, req, this.selectedMessageFile || undefined);
    } else if (this.editingItemType === 'GROUP') {
      const grp = this.chatGroupService.groups().find(g => g.id === this.editingItemId);
      if (grp) {
        this.chatGroupService.updateGroup(this.editingItemId, {
           name: this.editingContent, 
           description: this.editingDesc,
           theme: this.editingTheme || 'SUPPORT',
           ownerId: this.currentUserId(),
           memberIds: grp.members.map(m => m.id)
        });
      }
    }
    this.cancelEdit();
  }
 
  startGroupEdit(grp: ChatGroupDto) {
    this.editingItemId = grp.id!;
    this.editingItemType = 'GROUP';
    this.editingContent = grp.name;
    this.editingDesc = grp.description || '';
    this.editingTheme = grp.theme || 'SUPPORT';
  }
 
  startEdit(id: number, type: 'PUBLICATION' | 'COMMENT' | 'MESSAGE' | 'GROUP', currentContent: string) {
    this.editingItemId = id;
    this.editingItemType = type;
    this.editingContent = currentContent;
    if (type === 'PUBLICATION') {
        const pub = this.publicationService.publications().find(p => p.id === id);
        if (pub) {
            this.editingType = pub.type;
            this.editingAnonymous = pub.anonymous || false;
        }
    }
  }
 
  sendDirectMessage() {
    if (!this.dmReceiverId || !this.dmContent.trim()) return;
    
    const req: MessageCreateRequest = {
      content: this.dmContent,
      senderId: this.currentUserId(),
      receiverId: this.dmReceiverId
    };
    
    this.messageService.createMessage(req).subscribe(newMsg => {
        // Open DM chat if not already open
        if (this.activeDmUserId !== this.dmReceiverId) {
          this.openDmChat(this.dmReceiverId!);
        }
    });
    
    this.dmContent = '';
  }

  openDmChat(userId: number) {
    this.activeDmUserId = userId;
    // Fetch DM messages for this user
    this.fetchDmMessages(userId);
  }

  closeDmChat() {
    this.activeDmUserId = null;
    this.dmMessages.set([]);
  }

  sendDmMessage() {
    if (!this.activeDmUserId || !this.dmContent.trim()) return;
    
    const req: MessageCreateRequest = {
      content: this.dmContent,
      senderId: this.currentUserId(),
      receiverId: this.activeDmUserId
    };
    
    this.messageService.createMessage(req).subscribe(newMsg => {
        // The service doesn't update signals automatically for createMessage (it returns Observable)
        // We handle it here or in the effect
    });
    this.dmContent = '';
  }

  fetchDmMessages(userId: number) {
    // Fetch messages between current user and specified user
    this.messageService.fetchMessagesByUser(this.currentUserId());
    // Filter messages for this specific DM conversation
    setTimeout(() => {
      const allMessages = this.messageService.messages();
      const dmMessages = allMessages.filter(msg => 
        (msg.senderId === this.currentUserId() && msg.receiverId === userId) ||
        (msg.senderId === userId && msg.receiverId === this.currentUserId())
      );
      this.dmMessages.set(dmMessages);
    }, 100);
  }

  deleteNotification(id: number) {
      this.notificationService.deleteNotification(id);
      this.notificationService.fetchNotifications(this.currentUserId());
  }

  deleteItem(id: number, type: 'PUBLICATION' | 'COMMENT' | 'MESSAGE' | 'GROUP') {
    if(typeof window !== 'undefined' && !window.confirm('Are you sure you want to delete this?')) return;
    
    if (type === 'PUBLICATION') {
      this.publicationService.deletePublication(id);
    } else if (type === 'COMMENT') {
      this.commentService.deleteComment(id).subscribe(() => this.publicationService.fetchPublications());
    } else if (type === 'MESSAGE') {
      this.messageService.deleteMessage(id);
    } else if (type === 'GROUP') {
      this.chatGroupService.deleteGroup(id);
      if (this.chatGroupService.activeGroup()?.id === id) {
          this.leaveGroup();
      }
    }
  }
}
