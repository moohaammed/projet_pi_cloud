import { Injectable } from '@angular/core';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

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
    const socket = new SockJS(`http://localhost:8080/ws?userId=${userId}`);
    this.stompClient = new Client({
      webSocketFactory: () => socket,
      debug: (msg) => console.log(msg),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = (frame) => {
      console.log('Connected to Stomp: ' + frame);
      this.isConnected$.next(true);
    };

    this.stompClient.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    this.stompClient.activate();
  }

  public subscribe(roomId: string): void {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.subscribe(`/topic/call/${roomId}`, (message: Message) => {
        const signal: SignalMessage = JSON.parse(message.body);
        this.signalSubject.next(signal);
      });
    }
  }

  public sendSignal(roomId: string, signal: SignalMessage): void {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: `/app/call/${roomId}`,
        body: JSON.stringify(signal)
      });
    }
  }

  public disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.isConnected$.next(false);
    }
  }
}
