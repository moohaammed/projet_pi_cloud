import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Client } from '@stomp/stompjs';
import { MessageDto } from './message.service';
import { Notification } from './notification.service';
import { BehaviorSubject } from 'rxjs';
import { GuidanceService } from './guidance.service';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment'; 

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private platformId = inject(PLATFORM_ID);
  private guidanceService = inject(GuidanceService);
  private stompClient?: Client;

  /** The latest message received on any chat channel (group or DM) */
  public realtimeMessage = signal<MessageDto | null>(null);

  /** The latest CareBot message (legacy channel) */
  public carebotMessage = signal<any>(null);

  /** The latest notification received in real time */
  public notificationMessage = signal<Notification | null>(null);

  /** The latest live streaming status update */
  public liveStatusMessage = signal<any>(null);

  /** The latest WebRTC signaling message for video calls */
  public webrtcSignal = signal<any>(null);

  /** Live comment received during a live stream */
  public liveComment = signal<any>(null);

  /** Typing indicator — { senderId, typing: true/false } */
  public typingEvent = signal<any>(null);

  /** Observable that emits true when connected, false when disconnected */
  public connected$ = new BehaviorSubject<boolean>(false);

  constructor() { }

  connect(userId: number) {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.stompClient && this.stompClient.active) {
      this.stompClient.deactivate();
    }

const socket = new SockJS(`${environment.apiUrl}/ws?userId=${userId}`);

this.stompClient = new Client({
  webSocketFactory: () => socket,
  debug: (str: string) => console.log(str),
  reconnectDelay: 5000,
  heartbeatIncoming: 4000,
  heartbeatOutgoing: 4000,
});
     

    this.stompClient.onConnect = () => {
      console.log('Connected to WS as User', userId);
      this.connected$.next(true);
      this.subscribeToUserQueues();
    };

    this.stompClient.onDisconnect = () => {
      this.connected$.next(false);
    };

    this.stompClient.activate();
  }

  public setUserId(userId: number) {
    console.log('Setting WebSocket user ID:', userId);
    this.connect(userId);
  }

  /** Disconnects the WebSocket client */
  unsubscribe() {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.deactivate();
    }
  }

  /** Sends a WebRTC signaling message to the server for video call negotiation */
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

  subscribeToLiveComments(broadcasterId: number) {
    if (this.connected$.value && this.stompClient) {
      this.stompClient.subscribe('/topic/live/' + broadcasterId, (msg: any) => {
        this.liveComment.set(JSON.parse(msg.body));
      });
    }
  }

  /** Subscribes to typing indicators for a group */
  subscribeToGroupTyping(groupId: string) {
    if (this.connected$.value && this.stompClient) {
      this.stompClient.subscribe('/topic/group/' + groupId + '/typing', (msg: any) => {
        this.typingEvent.set(JSON.parse(msg.body));
      });
    }
  }

  /** Sends a typing indicator event */
  sendTyping(senderId: number, targetId?: number, groupId?: string, typing: boolean = true) {
    if (this.stompClient?.connected) {
      this.stompClient.publish({
        destination: '/app/typing',
        body: JSON.stringify({ senderId, targetId, groupId, typing })
      });
    }
  }

  /** Re-subscribes to user queues (called externally if needed after reconnect) */
  subscribeToUser(_uid: number) {
    if (this.stompClient?.connected) {
      this.subscribeToUserQueues();
    }
  }

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

    this.stompClient.subscribe(`/user/queue/voice-prompt`, (msg: any) => {
      const data = JSON.parse(msg.body);
      if (data?.text) {
        this.guidanceService.speak(data.text);
      }
    });

    this.stompClient.subscribe(`/user/queue/typing`, (msg: any) => {
      this.typingEvent.set(JSON.parse(msg.body));
    });
  }
}
