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
  public liveStatusMessage = signal<any>(null);
  public webrtcSignal = signal<any>(null);
  public connected$ = new BehaviorSubject<boolean>(false);

  constructor() { }

  connect(userId: number) {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.stompClient && this.stompClient.active) {
      this.stompClient.deactivate();
    }

    this.stompClient = new Client({
      brokerURL: `ws://localhost:8081/ws?userId=${userId}`,
      debug: (str: string) => console.log(str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = () => {
      console.log('Connected to WS as User', userId);
      this.connected$.next(true);
      // Subscribe here while the session is definitely connected (avoid relying on connected$ ordering).
      this.subscribeToUserQueues();
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
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.deactivate();
    }
  }

  sendWebRtcSignal(payload: any) {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: '/app/webrtc.signal',
        body: JSON.stringify(payload)
      });
    } else {
      console.warn('Cannot send WebRTC signal: Stomp client not connected.');
    }
  }

  subscribeToGroup(gid: string) {
    if (this.connected$.value && this.stompClient) {
      this.stompClient.subscribe('/topic/group/' + gid, (msg: any) => {
        this.realtimeMessage.set(JSON.parse(msg.body));
      });
    }
  }

  subscribeToUser(uid: number) {
    if (this.stompClient?.connected) {
      this.subscribeToUserQueues();
    }
  }

  /** Private/direct + notifications (+ carebot if backend uses it). Call from onConnect or when already connected. */
  private subscribeToUserQueues() {
    if (!this.stompClient?.connected) return;
    this.stompClient.subscribe(`/user/queue/direct`, (msg: any) => {
      this.realtimeMessage.set(JSON.parse(msg.body));
    });
    this.stompClient.subscribe(`/user/queue/notifications`, (msg: any) => {
      this.notificationMessage.set(JSON.parse(msg.body));
    });
    this.stompClient.subscribe(`/user/queue/carebot`, (msg: any) => {
      this.carebotMessage.set(JSON.parse(msg.body));
    });
    this.stompClient.subscribe(`/topic/live-status`, (msg: any) => {
      this.liveStatusMessage.set(JSON.parse(msg.body));
    });
    this.stompClient.subscribe(`/user/queue/webrtc`, (msg: any) => {
      this.webrtcSignal.set(JSON.parse(msg.body));
    });
  }
}
