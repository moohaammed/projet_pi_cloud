import { Injectable } from '@angular/core';
import { Client, Message } from '@stomp/stompjs';
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

  public signalMessages$ = this.signalSubject.asObservable();
  public isConnected$ = new BehaviorSubject<boolean>(false);

  constructor() {}

  public connect(userId: string): void {
    if (this.stompClient?.connected) return; // Déjà connecté

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

  public subscribe(roomId: string): void {
    if (this.stompClient && this.stompClient.connected) {
      console.log('WS: Souscription au topic /topic/call/' + roomId);
      this.stompClient.subscribe(`/topic/call/${roomId}`, (message: Message) => {
        const signal: SignalMessage = JSON.parse(message.body);
        console.log('WS SIGNAL REÇU:', signal.type, 'de', signal.senderId);
        this.signalSubject.next(signal);
      });
    } else {
      console.error('WS: Impossible de souscrire, non connecté.');
    }
  }

  public sendSignal(roomId: string, message: any) {
    if (this.stompClient && this.stompClient.connected) {
      // Envoi direct sur le broker pour éviter toute perte de données par le Java
      this.stompClient.publish({
        destination: `/topic/call/${roomId}`,
        body: JSON.stringify(message)
      });
      console.log('WS SIGNAL ENVOYÉ:', message.type);
    } else {
      console.error("WS: Échec envoi signal - client déconnecté.");
    }
  }

  public disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.isConnected$.next(false);
    }
  }
}
