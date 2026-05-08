import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface PollOptionDto {
  id: string;
  text: string;
  votes: number;
  voterIds: number[];
}

export interface MessageDto {
  id: string;
  content: string;
  
  mediaUrls?: string[];
  mimeTypes?: string[];
  
  mediaUrl?: string;
  mimeType?: string;
  
  sentAt: string;
  senderId: number;
  senderName: string;
  receiverId?: number;
  chatGroupId?: string;
  isDistressed?: boolean;
  distressed?: boolean;
  parentMessageId?: string;
  parentMessageContent?: string;
  parentMessageSenderName?: string;
  type?: 'TEXT' | 'POLL' | 'PUBLICATION' | 'BOT_MESSAGE' | 'MEDICATION_REMINDER';
  pollQuestion?: string;
  pollOptions?: PollOptionDto[];
  sharedPublicationId?: string;
  sharedPublication?: any;
  pinned?: boolean;
  isPinned?: boolean;
  sentimentScore?: number;
  fromBot?: boolean;
  viewedByUserIds?: number[];
}

/** Alias kept for backward compatibility with older component code */
export type MessageResponseDto = MessageDto;

export interface MessageCreateRequest {
  content: string;
  senderId: number;
  receiverId?: number;
  chatGroupId?: string;
  parentMessageId?: string;
  sharedPublicationId?: string;
  type?: 'TEXT' | 'POLL' | 'PUBLICATION' | 'BOT_MESSAGE';
  pollQuestion?: string;
  pollOptions?: string[];
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/messages`;

  public messages = signal<MessageDto[]>([]);

  fetchMessagesByUser(uid: number) {
    this.http.get<MessageDto[]>(`${this.apiUrl}/user/${uid}`).subscribe(data => this.messages.set(data));
  }

  fetchMessagesByGroup(gid: string) {
    this.http.get<MessageDto[]>(`${this.apiUrl}/group/${gid}`).subscribe(data => this.messages.set(data));
  }

  fetchMessagesByGroupPaged(gid: string, page = 0, size = 30) {
    return this.http.get<MessageDto[]>(`${this.apiUrl}/group/${gid}/page`, {
      params: { page: String(page), size: String(size) }
    });
  }

  fetchMessagesByGroupSync(gid: string) {
    return this.http.get<MessageDto[]>(`${this.apiUrl}/group/${gid}`);
  }

  createMessage(req: MessageCreateRequest, files?: File[]) {
    const formData = new FormData();
    formData.append('content', req.content);
    formData.append('senderId', req.senderId.toString());
    if (req.receiverId) formData.append('receiverId', req.receiverId.toString());
    if (req.chatGroupId) formData.append('chatGroupId', req.chatGroupId);
    if (req.parentMessageId) formData.append('parentMessageId', req.parentMessageId);
    if (req.sharedPublicationId) formData.append('sharedPublicationId', req.sharedPublicationId);
    if (req.type) formData.append('type', req.type);
    if (req.pollQuestion) formData.append('pollQuestion', req.pollQuestion);
    if (req.pollOptions) req.pollOptions.forEach(opt => formData.append('pollOptions', opt));
    
    if (files && files.length > 0) {
      files.forEach(file => formData.append('files', file));
    }
    
    return this.http.post<MessageDto>(this.apiUrl, formData);
  }

  fetchDirectMessages(userId1: number, userId2: number) {
    return this.http.get<MessageDto[]>(`${this.apiUrl}/direct/${userId1}/${userId2}`);
  }

  fetchBotMessages(userId: number) {
    return this.http.get<MessageDto[]>(`${this.apiUrl}/bot/${userId}`);
  }

  fetchDirectMessagePeers(userId: number) {
    return this.http.get<number[]>(`${this.apiUrl}/peers/${userId}`);
  }

  deleteMessage(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  updateMessage(id: string, req: MessageCreateRequest, file?: File) {
    const formData = new FormData();
    formData.append('content', req.content);
    formData.append('senderId', req.senderId.toString());
    if (req.receiverId) formData.append('receiverId', req.receiverId.toString());
    if (req.chatGroupId) formData.append('chatGroupId', req.chatGroupId);
    if (file) formData.append('file', file);
    return this.http.put<MessageDto>(`${this.apiUrl}/${id}`, formData);
  }

  voteOnPoll(messageId: string, userId: number, optionId: string) {
    return this.http.post<MessageDto>(`${this.apiUrl}/${messageId}/vote`, null, {
      params: { userId, optionId }
    });
  }

  markAsRead(messageId: string, userId: number) {
    return this.http.post<void>(`${this.apiUrl}/${messageId}/read`, null, {
      params: { userId: String(userId) }
    });
  }

  togglePin(messageId: string) {
    return this.http.post<MessageDto>(`${this.apiUrl}/${messageId}/pin`, {});
  }

  sendLiveComment(senderId: number, broadcasterId: number, content: string) {
    return this.http.post<MessageDto>(`${this.apiUrl}/live-comment`, null, {
      params: { senderId: String(senderId), broadcasterId: String(broadcasterId), content }
    });
  }

  getAiHandoverSummary(groupId: string) {
    return this.http.get<{summary: string}>(`http://localhost:8080/api/handover/group/${groupId}`);
  }
}
