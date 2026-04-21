import { Injectable, signal, inject } from '@angular/core';
import { WebSocketService } from './websocket.service';

export interface WebRtcSignal {
  type: string;
  senderId: number;
  targetId: number;
  sdp?: any;
  candidate?: any;
}

@Injectable({
  providedIn: 'root'
})
export class WebRtcService {
  private ws = inject(WebSocketService);

  public localStream: MediaStream | null = null;
  public remoteStreams = signal<{ [userId: number]: MediaStream }>({});
  public remoteStreamStatus = signal<{ [userId: number]: 'CONNECTING' | 'CONNECTED' }>({});

  private peerConnections: Map<number, RTCPeerConnection> = new Map();

  private config: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  constructor() { }

  initialize() {
    console.log('WebRtcService Initialized');
  }

  handleSignal(signalMsg: WebRtcSignal, currentUserId: number) {
    console.log(`%c[WebRTC SIGNAL IN]`, `background: #222; color: #bada55`, `Received ${signalMsg.type} target=${signalMsg.targetId} me=${currentUserId}`);
    if (Number(signalMsg.targetId) !== Number(currentUserId)) {
      console.warn(`[WebRTC] Ignored signal because targetId ${signalMsg.targetId} != currentUserId ${currentUserId}`);
      return;
    }

    const peerId = signalMsg.senderId;

    switch (signalMsg.type) {
      case 'request-watch':
        this.handleRequestWatch(peerId, currentUserId);
        break;
      case 'offer':
        this.handleOffer(peerId, signalMsg.sdp, currentUserId);
        break;
      case 'answer':
        this.handleAnswer(peerId, signalMsg.sdp);
        break;
      case 'ice-candidate':
        this.handleIceCandidate(peerId, signalMsg.candidate);
        break;
    }
  }

  private async handleRequestWatch(viewerId: number, broadcasterId: number) {
    console.log(`%c[WebRTC BROADCASTER]`, `background: #000; color: #ff0000`, `Processing request-watch from Viewer ${viewerId}`);
    
    if (!this.localStream) {
      console.error(`[WebRTC ERROR] Broadcaster has NO localStream available! The camera is not active or hasn't loaded yet!`);
      return; 
    }
    
    try {
      const pc = this.createPeerConnection(viewerId, broadcasterId);
      
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
      console.log(`[WebRTC BROADCASTER] Added tracks, generating SDP Offer...`);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      console.log(`[WebRTC BROADCASTER] Local Description Set! Sending Offer to Backend...`);

      this.ws.sendWebRtcSignal({
        type: 'offer',
        senderId: broadcasterId,
        targetId: viewerId,
        sdp: offer.sdp
      });
    } catch (e) {
      console.error(`[WebRTC CRITICAL ERROR] Broadcaster crashed while generating Offer:`, e);
    }
  }

  private async handleOffer(broadcasterId: number, sdpStr: string, viewerId: number) {
    console.log(`%c[WebRTC VIEWER]`, `background: #111; color: #00ff00`, `Received SDP Offer from Broadcaster ${broadcasterId}`);
    try {
      const pc = this.createPeerConnection(broadcasterId, viewerId);
      
      console.log(`[WebRTC VIEWER] Setting Remote Description...`);
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: sdpStr }));
      
      console.log(`[WebRTC VIEWER] Generating SDP Answer...`);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log(`[WebRTC VIEWER] Local Description Set! Sending Answer to Backend...`);
      this.ws.sendWebRtcSignal({
        type: 'answer',
        senderId: viewerId,
        targetId: broadcasterId,
        sdp: answer.sdp
      });
    } catch(e) {
      console.error(`[WebRTC CRITICAL ERROR] Viewer crashed while generating Answer:`, e);
    }
  }

  private async handleAnswer(viewerId: number, sdpStr: string) {
    console.log(`%c[WebRTC BROADCASTER]`, `background: #000; color: #ff0000`, `Received SDP Answer from Viewer ${viewerId}`);
    const pc = this.peerConnections.get(viewerId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: sdpStr }));
        console.log(`[WebRTC BROADCASTER] Remote Description Successfully Set! P2P Pipe successfully negotiated!`);
      } catch (e) {
        console.error(`[WebRTC CRITICAL ERROR] Broadcaster failed to set Remote Description answer:`, e);
      }
    } else {
      console.error(`[WebRTC WARNING] Broadcaster got answer but PeerConnection is missing!`);
    }
  }

  private async handleIceCandidate(peerId: number, candidateObj: any) {
    console.log(`[WebRTC] Received ICE Candidate from ${peerId}`);
    const pc = this.peerConnections.get(peerId);
    if (pc && candidateObj) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidateObj));
      } catch (e) {
        console.error('[WebRTC ERROR] Error adding received ice candidate', e);
      }
    }
  }

  public watchStream(broadcasterId: number, viewerId: number) {
    this.remoteStreamStatus.update(s => ({ ...s, [broadcasterId]: 'CONNECTING' }));

    this.ws.sendWebRtcSignal({
      type: 'request-watch',
      senderId: viewerId,
      targetId: broadcasterId
    });
  }

  public endWatch(broadcasterId: number) {
    const pc = this.peerConnections.get(broadcasterId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(broadcasterId);
    }
    const currentStreams = this.remoteStreams();
    if (currentStreams[broadcasterId]) {
      const updated = { ...currentStreams };
      delete updated[broadcasterId];
      this.remoteStreams.set(updated);
    }
  }

  public stopAll() {
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.localStream = null;
    this.remoteStreams.set({});
    this.remoteStreamStatus.set({});
  }

  private createPeerConnection(peerId: number, selfId: number): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.config);
    this.peerConnections.set(peerId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`WebRTC: Sending ICE candidate to ${peerId}`);
        this.ws.sendWebRtcSignal({
          type: 'ice-candidate',
          senderId: selfId,
          targetId: peerId,
          candidate: event.candidate.toJSON()
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(`WebRTC: Received remote track from peer ${peerId}`, event.track.kind);
      const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
      
      const currentStreams = this.remoteStreams();
      
      if (currentStreams[peerId]) {
         currentStreams[peerId].addTrack(event.track);
         this.remoteStreams.set({ ...currentStreams });
      } else {
         this.remoteStreams.set({ ...currentStreams, [peerId]: stream });
      }
      this.remoteStreamStatus.update(s => ({ ...s, [peerId]: 'CONNECTED' }));
    };

    return pc;
  }
}
