import { Injectable, signal } from '@angular/core';
import { Client, StompSubscription, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Subject } from 'rxjs';

export interface SignalMessage {
  type: string;
  senderId: string;
  recipientId?: string;
  data: any;
}

@Injectable({
  providedIn: 'root'
})
export class VideoCallService {
  private stompClient: Client | null = null;
  private signalSubject = new Subject<SignalMessage>();
  /** One STOMP subscription per room so messenger can listen + overlay can join without duplicates. */
  private roomSubscriptions = new Map<string, StompSubscription>();
  private pendingRoomIds = new Set<string>();
  /** Per-user DM video ring (server: convertAndSendToUser → /user/queue/videocall). */
  private userVideoQueueSub: StompSubscription | null = null;

  public signalMessages$ = this.signalSubject.asObservable();
  public isConnected$ = new BehaviorSubject<boolean>(false);

  // Overlay control signals
  public showCallOverlay = signal(false);
  public currentRoomId = signal('');

  constructor() {}

  public openCall(roomId: string) {
    this.currentRoomId.set(roomId);
    this.showCallOverlay.set(true);
  }

  public closeCallOverlay() {
    this.showCallOverlay.set(false);
    this.currentRoomId.set('');
  }

  public connect(userId: string): void {
    // If already connected or connecting to the same user, do nothing
    if (this.stompClient) {
      if (this.stompClient.connected) {
        console.log('WS: Déjà connecté.');
        this.ensureSubscribedToUserVideoQueue();
        return;
      }
      if (this.stompClient.active) {
        console.log('WS: Connexion déjà en cours...');
        return;
      }
    }
    console.log('WS: Connexion pour user:', userId);
    const socket = new SockJS(`http://localhost:8080/ws?userId=${userId}`);
    this.stompClient = new Client({
      webSocketFactory: () => socket,
      debug: (msg) => console.log('STOMP Debug:', msg),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = (frame) => {
      console.log('WS: Connecté avec succès !');
      this.isConnected$.next(true);
      this.ensureSubscribedToUserVideoQueue();
      const pending = [...this.pendingRoomIds];
      this.pendingRoomIds.clear();
      pending.forEach((rid) => this.ensureSubscribedToRoom(rid));
    };

    this.stompClient.onStompError = (frame) => {
      console.error('WS Error:', frame);
      this.isConnected$.next(false);
    };

    this.stompClient.onWebSocketClose = () => {
      console.warn('WS: Déconnecté.');
      this.isConnected$.next(false);
    };

    this.stompClient.activate();
  }

  /** Subscribe to call signals for a room (idempotent). */
  public ensureSubscribedToRoom(roomId: string): void {
    if (!roomId || this.roomSubscriptions.has(roomId)) return;
    if (!this.stompClient || !this.stompClient.connected) {
      this.pendingRoomIds.add(roomId);
      return;
    }
    console.log('WS: Souscription au topic /topic/call/' + roomId);
    const sub = this.stompClient.subscribe(`/topic/call/${roomId}`, (message: Message) => {
      const signal: SignalMessage = JSON.parse(message.body);
      console.log('WS SIGNAL REÇU:', signal.type, 'de', signal.senderId);
      this.signalSubject.next(signal);
    });
    this.roomSubscriptions.set(roomId, sub);
  }

  private ensureSubscribedToUserVideoQueue(): void {
    if (!this.stompClient?.connected) return;
    if (this.userVideoQueueSub) {
      try {
        this.userVideoQueueSub.unsubscribe();
      } catch {
        /* ignore */
      }
      this.userVideoQueueSub = null;
    }
    console.log('WS: Souscription /user/queue/videocall');
    this.userVideoQueueSub = this.stompClient.subscribe('/user/queue/videocall', (message: Message) => {
      const signal: SignalMessage = JSON.parse(message.body);
      console.log('WS (user queue) REÇU:', signal.type, signal.senderId);
      this.signalSubject.next(signal);
    });
  }

  public unsubscribeFromRoom(roomId: string): void {
    this.pendingRoomIds.delete(roomId);
    const sub = this.roomSubscriptions.get(roomId);
    if (sub) {
      sub.unsubscribe();
      this.roomSubscriptions.delete(roomId);
    }
  }

  public subscribe(roomId: string): void {
    this.ensureSubscribedToRoom(roomId);
  }

  public sendSignal(roomId: string, message: any) {
    if (this.stompClient && this.stompClient.connected) {
      // Spring STOMP: clients must SEND to /app/... so @MessageMapping rebroadcasts to /topic/...
      // (publishing directly to /topic/call/... from the browser is not delivered to other subscribers)
      this.stompClient.publish({
        destination: `/app/call/${roomId}`,
        body: JSON.stringify(message),
        headers: { 'content-type': 'application/json' },
      });
      console.log('WS SIGNAL ENVOYÉ:', message.type, '→ /app/call/' + roomId);
    } else {
      console.error("WS: Échec envoi signal - client déconnecté.");
    }
  }

  public disconnect(): void {
    for (const sub of this.roomSubscriptions.values()) {
      sub.unsubscribe();
    }
    this.roomSubscriptions.clear();
    this.pendingRoomIds.clear();
    if (this.userVideoQueueSub) {
      try {
        this.userVideoQueueSub.unsubscribe();
      } catch {
        /* ignore */
      }
      this.userVideoQueueSub = null;
    }
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.isConnected$.next(false);
    }
  }
}
