import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
 
export interface PollOptionDto {
  id: number;
  text: string;
  votes: number;
  voterIds: number[];
}
 
export interface MessageDto {
  id: number;
  content: string;
  mediaUrl?: string;
  mimeType?: string;
  sentAt: string;
  senderId: number;
  senderName: string;
  receiverId?: number;
  chatGroupId?: number;
  isDistressed?: boolean;
  distressed?: boolean;
  parentMessageId?: number;
  parentMessageContent?: string;
  parentMessageSenderName?: string;
  type?: 'TEXT' | 'POLL' | 'PUBLICATION' | 'BOT_MESSAGE' | 'MEDICATION_REMINDER';
  pollQuestion?: string;
  pollOptions?: PollOptionDto[];
  sharedPublicationId?: number;
  sharedPublication?: any; // To hold the nested publication object
  pinned?: boolean;
  isPinned?: boolean;
  sentimentScore?: number;
  fromBot?: boolean;
}
 
export type MessageResponseDto = MessageDto;
 
export interface MessageCreateRequest {
  content: string;
  senderId: number;
  receiverId?: number;
  chatGroupId?: number;
  parentMessageId?: number;
  sharedPublicationId?: number;
  type?: 'TEXT' | 'POLL' | 'PUBLICATION' | 'BOT_MESSAGE';
  pollQuestion?: string;
  pollOptions?: string[];
}
 
@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/messages';
  public messages = signal<MessageDto[]>([]);
 
  fetchMessagesByUser(uid: number) {
    this.http.get<MessageDto[]>(`${this.baseUrl}/user/${uid}`).subscribe(data => this.messages.set(data));
  }
 
  fetchMessagesByGroup(gid: number) {
    this.http.get<MessageDto[]>(`${this.baseUrl}/group/${gid}`).subscribe(data => this.messages.set(data));
  }
 
  createMessage(req: MessageCreateRequest, file?: File) {
    const formData = new FormData();
    formData.append('content', req.content);
    formData.append('senderId', req.senderId.toString());
    if (req.receiverId) formData.append('receiverId', req.receiverId.toString());
    if (req.chatGroupId) formData.append('chatGroupId', req.chatGroupId.toString());
    if (req.parentMessageId) formData.append('parentMessageId', req.parentMessageId.toString());
    if (req.sharedPublicationId) formData.append('sharedPublicationId', req.sharedPublicationId.toString());
    if (req.type) formData.append('type', req.type);
    if (req.pollQuestion) formData.append('pollQuestion', req.pollQuestion);
    if (req.pollOptions) {
      req.pollOptions.forEach(opt => formData.append('pollOptions', opt));
    }
    if (file) formData.append('file', file);
    return this.http.post<MessageDto>(this.baseUrl, formData);
  }
 
  fetchDirectMessages(userId1: number, userId2: number) {
    return this.http.get<MessageDto[]>(`${this.baseUrl}/direct/${userId1}/${userId2}`);
  }

  fetchBotMessages(userId: number) {
    return this.http.get<MessageDto[]>(`${this.baseUrl}/bot/${userId}`);
  }

  deleteMessage(id: number) { 
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
 
  updateMessage(id: number, req: MessageCreateRequest, file?: File) {
    const formData = new FormData();
    formData.append('content', req.content);
    formData.append('senderId', req.senderId.toString());
    if (req.receiverId) formData.append('receiverId', req.receiverId.toString());
    if (req.chatGroupId) formData.append('chatGroupId', req.chatGroupId.toString());
    if (file) formData.append('file', file);
    return this.http.put<MessageDto>(`${this.baseUrl}/${id}`, formData);
  }
 
  voteOnPoll(messageId: number, userId: number, optionId: number) {
    return this.http.post<MessageDto>(`${this.baseUrl}/${messageId}/vote`, null, {
      params: { userId, optionId }
    });
  }
 
  togglePin(messageId: number) {
    return this.http.post<MessageDto>(`${this.baseUrl}/${messageId}/pin`, {});
  }
}
