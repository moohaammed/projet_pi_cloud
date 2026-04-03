import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Client } from '@stomp/stompjs';
import { MessageDto } from './message.service';
import { Notification } from './notification.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private platformId = inject(PLATFORM_ID);
  private stompClient?: Client;
  public realtimeMessage = signal<MessageDto | null>(null);
  public carebotMessage = signal<any>(null);
  public notificationMessage = signal<Notification | null>(null);
  public connected$ = new BehaviorSubject<boolean>(false);

  constructor() { }

  connect(userId: number) {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.stompClient && this.stompClient.active) {
      this.stompClient.deactivate();
    }

    this.stompClient = new Client({
      brokerURL: `ws://localhost:8080/ws?userId=${userId}`,
      debug: (str: string) => console.log(str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = () => {
      console.log('Connected to WS as User', userId);
      this.connected$.next(true);
      this.subscribeToUser(userId);
    };

    this.stompClient.onDisconnect = () => {
      this.connected$.next(false);
    };

    this.stompClient.activate();
  }

  setUserId(userId: number) {
    console.log('Setting WebSocket user ID:', userId);
    this.connect(userId);
  }

  unsubscribe() {
    // Method to unsubscribe from all subscriptions
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.deactivate();
    }
  }

  subscribeToGroup(gid: number) {
    if (this.connected$.value && this.stompClient) {
      this.stompClient.subscribe('/topic/group/' + gid, (msg: any) => {
        this.realtimeMessage.set(JSON.parse(msg.body));
      });
    }
  }

  subscribeToUser(uid: number) {
    if (this.connected$.value && this.stompClient) {
      this.stompClient.subscribe(`/user/queue/direct`, (msg: any) => {
        this.realtimeMessage.set(JSON.parse(msg.body));
      });
      this.stompClient.subscribe(`/user/queue/notifications`, (msg: any) => {
        this.notificationMessage.set(JSON.parse(msg.body));
      });
      this.stompClient.subscribe(`/user/queue/carebot`, (msg: any) => {
        this.carebotMessage.set(JSON.parse(msg.body));
      });
    }
  }
}
