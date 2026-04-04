import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoCallService, SignalMessage } from '../../services/videocall.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-videocall',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './videocall.component.html',
  styleUrl: './videocall.component.css'
})
export class VideoCallComponent implements OnInit, OnDestroy {
  @Input() roomId: string = '';
  @Output() closeCall = new EventEmitter<void>();

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  private localStream?: MediaStream;
  private peerConnection?: RTCPeerConnection;
  private subscription?: Subscription;
  private currentUser: any;

  public isMuted = false;
  public isVideoOff = false;
  public connectionStatus = 'Initialisation...';

  private readonly iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  constructor(
    private videoCallService: VideoCallService,
    private authService: AuthService
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  async ngOnInit() {
    this.videoCallService.connect(this.currentUser.id.toString());
    
    this.subscription = this.videoCallService.isConnected$.subscribe(connected => {
      if (connected) {
        this.videoCallService.subscribe(this.roomId);
        this.startLocalStream();
      }
    });

    this.videoCallService.signalMessages$.subscribe(msg => {
      this.handleSignalMessage(msg);
    });
  }

  ngOnDestroy() {
    this.hangup();
    this.subscription?.unsubscribe();
    this.videoCallService.disconnect();
  }

  private async startLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (this.localVideo) {
        this.localVideo.nativeElement.srcObject = this.localStream;
      }
      this.connectionStatus = 'Prêt. En attente de l\'autre participant...';
    } catch (err) {
      console.error('Erreur accès média:', err);
      this.connectionStatus = 'Erreur: Accès caméra/micro refusé';
    }
  }

  private createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.iceServers);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.videoCallService.sendSignal(this.roomId, {
          type: 'ice-candidate',
          senderId: this.currentUser.id.toString(),
          data: event.candidate
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      if (this.remoteVideo) {
        this.remoteVideo.nativeElement.srcObject = event.streams[0];
        this.connectionStatus = 'Connecté';
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }
  }

  public async startCall() {
    this.createPeerConnection();
    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);

    this.videoCallService.sendSignal(this.roomId, {
      type: 'offer',
      senderId: this.currentUser.id.toString(),
      data: offer
    });
    this.connectionStatus = 'Appel en cours...';
  }

  private async handleSignalMessage(msg: SignalMessage) {
    if (msg.senderId === this.currentUser.id.toString()) return;

    if (msg.type === 'offer') {
      this.createPeerConnection();
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(msg.data));
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      this.videoCallService.sendSignal(this.roomId, {
        type: 'answer',
        senderId: this.currentUser.id.toString(),
        data: answer
      });
    } else if (msg.type === 'answer') {
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(msg.data));
    } else if (msg.type === 'ice-candidate') {
      try {
        await this.peerConnection?.addIceCandidate(new RTCIceCandidate(msg.data));
      } catch (e) {
        console.error('Erreur ajout ICE candidate', e);
      }
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    this.localStream?.getAudioTracks().forEach(track => track.enabled = !this.isMuted);
  }

  public toggleVideo() {
    this.isVideoOff = !this.isVideoOff;
    this.localStream?.getVideoTracks().forEach(track => track.enabled = !this.isVideoOff);
  }

  public hangup() {
    this.localStream?.getTracks().forEach(track => track.stop());
    this.peerConnection?.close();
    this.closeCall.emit();
  }
}
