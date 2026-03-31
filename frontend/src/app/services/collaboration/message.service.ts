import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
 
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
  distressed?: boolean;
  parentMessageId?: number;
  parentMessageContent?: string;
  parentMessageSenderName?: string;
}
 
export interface MessageCreateRequest {
  content: string;
  senderId: number;
  receiverId?: number;
  chatGroupId?: number;
  parentMessageId?: number;
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
    if (file) formData.append('file', file);
    return this.http.post<MessageDto>(this.baseUrl, formData);
  }
 
  deleteMessage(id: number) { 
    return this.http.delete(`${this.baseUrl}/${id}`).subscribe(() => {
      this.messages.update(msgs => msgs.filter(m => m.id !== id));
    });
  }

  updateMessage(id: number, req: MessageCreateRequest, file?: File) {
    const formData = new FormData();
    formData.append('content', req.content);
    formData.append('senderId', req.senderId.toString());
    if (req.receiverId) formData.append('receiverId', req.receiverId.toString());
    if (req.chatGroupId) formData.append('chatGroupId', req.chatGroupId.toString());
    if (file) formData.append('file', file);
    return this.http.put<MessageDto>(`${this.baseUrl}/${id}`, formData).subscribe(updatedMsg => {
      this.messages.update(msgs => msgs.map(m => m.id === id ? updatedMsg : m));
    });
  }
}
