import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Message {
  id?: number;
  content: string;
  mediaUrl?: string;
  mimeType?: string;
  sentAt?: string;
  sender?: any;
  receiver?: any;
  chatGroup?: any;
  isDistressed?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/messages';

  public messages = signal<Message[]>([]);

  fetchMessages() {
    this.http.get<Message[]>(this.baseUrl).subscribe(res => {
      this.messages.set(res);
    });
  }

  fetchMessagesByGroup(groupId: number) {
    this.http.get<Message[]>(`${this.baseUrl}/group/${groupId}`).subscribe(res => {
      console.log(`FETCHED ${res?.length} MESSAGES for group ${groupId}:`, res);
      this.messages.set(res);
    });
  }

  createMessage(formData: FormData, groupId?: number) {
    this.http.post<Message>(this.baseUrl, formData).subscribe({
      next: () => {
        if (groupId) {
            this.fetchMessagesByGroup(groupId);
        } else {
            this.fetchMessages();
        }
      },
      error: (err) => console.error(err)
    });
  }
}
