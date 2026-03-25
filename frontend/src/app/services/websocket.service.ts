import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Client, Message } from '@stomp/stompjs';
import { Message as ChatMessage } from './message.service';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private client!: Client;
  public realtimeMessage = signal<ChatMessage | null>(null);
  private currentSubscription: any;
  private platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.client = new Client({
        brokerURL: 'ws://localhost:8080/ws',
        reconnectDelay: 2000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });
      
      this.client.onStompError = (frame) => {
        console.error('WebSocket Error: ' + frame.headers['message']);
        console.error('Details: ' + frame.body);
      };

      this.client.activate();
    }
  }

  subscribeToGroup(groupId: number) {
    if (!isPlatformBrowser(this.platformId) || !this.client) return;

    if (this.currentSubscription) {
      this.currentSubscription.unsubscribe();
    }
    
    const subscribeAction = () => {
      this.currentSubscription = this.client.subscribe(`/topic/group/${groupId}`, (message: Message) => {
        if (message.body) {
          const chatMsg: ChatMessage = JSON.parse(message.body);
          this.realtimeMessage.set(chatMsg);
        }
      });
    };

    if (this.client.connected) {
        subscribeAction();
    } else {
        this.client.onConnect = () => subscribeAction();
    }
  }

  unsubscribe() {
    if (this.currentSubscription) {
      this.currentSubscription.unsubscribe();
      this.currentSubscription = null;
    }
  }
}
