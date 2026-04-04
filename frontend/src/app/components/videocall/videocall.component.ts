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
<<<<<<< Updated upstream
=======
  public participants: Map<string, string> = new Map();
  public incomingCall: boolean = false;
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
=======
        // Signaler sa présence
        setTimeout(() => this.sendJoinSignal(), 1000);
>>>>>>> Stashed changes
      }
    });

    this.videoCallService.signalMessages$.subscribe(msg => {
      this.handleSignalMessage(msg);
    });
  }

  ngOnDestroy() {
<<<<<<< Updated upstream
=======
    this.sendLeaveSignal();
>>>>>>> Stashed changes
    this.hangup();
    this.subscription?.unsubscribe();
    this.videoCallService.disconnect();
  }

<<<<<<< Updated upstream
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
=======
  private sendJoinSignal() {
    this.videoCallService.sendSignal(this.roomId, {
      type: 'join',
      senderId: this.currentUser.id.toString(),
      data: { name: this.currentUser.nom || 'Utilisateur' }
    });
  }

  private processJoin(msg: SignalMessage) {
    if (msg.senderId === this.currentUser.id.toString()) return;
    
    const name = msg.data?.name || `Utilisateur ${msg.senderId}`;
    this.participants.set(msg.senderId, name);
    console.log(`--- ${name} a rejoint l'appel ---`);
    
    // Si nous sommes déjà connectés, on répond pour dire qu'on est là
    if (msg.type === 'join') {
      this.videoCallService.sendSignal(this.roomId, {
        type: 'join-reply',
        senderId: this.currentUser.id.toString(),
        data: { name: this.currentUser.nom || 'Utilisateur' }
      });
    }
  }

  private sendLeaveSignal() {
    this.videoCallService.sendSignal(this.roomId, {
      type: 'leave',
      senderId: this.currentUser.id.toString(),
      data: {}
    });
  }

  private async startLocalStream() {
    try {
      // Tentative 1: Vidéo + Audio
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (e) {
      console.warn("Échec vidéo+audio, tentative audio seul...", e);
      try {
        // Tentative 2: Audio seul (plus de chances de marcher)
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        this.isVideoOff = true;
      } catch (e2) {
        console.error("Échec total d'accès média", e2);
        this.connectionStatus = 'Erreur: Accès caméra/micro refusé';
        return;
      }
    }

    if (this.localStream) {
      this.localVideo.nativeElement.srcObject = this.localStream;
      this.connectionStatus = 'Prêt';
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
      if (this.remoteVideo) {
        this.remoteVideo.nativeElement.srcObject = event.streams[0];
=======
      console.log('--- Flux audio/vidéo distant reçu ! ---');
      if (this.remoteVideo) {
        this.remoteVideo.nativeElement.srcObject = event.streams[0];
        this.remoteVideo.nativeElement.volume = 1.0; // S'assurer que le son n'est pas à 0
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======
    console.log('--- Démarrage de l\'appel (OFFER) ---');
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======
    if (!msg || msg.senderId === this.currentUser.id.toString()) return;
    console.log(' Signal reçu:', msg.type, 'de', msg.senderId, 'Données:', msg.data);

    if (!msg.data) {
      console.warn('Signal reçu sans données, ignorer.');
      return;
    }

    try {
      if (msg.type === 'join' || msg.type === 'join-reply') {
        this.processJoin(msg);
      } else if (msg.type === 'leave') {
        this.participants.delete(msg.senderId);
        console.log(`Utilisateur ${msg.senderId} a quitté.`);
      } else if (msg.type === 'offer') {
        console.log('-> Réception d\'une OFFER, création de l\'ANSWER...');
        this.createPeerConnection();
        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(msg.data));
        const answer = await this.peerConnection!.createAnswer();
        await this.peerConnection!.setLocalDescription(answer);

        this.videoCallService.sendSignal(this.roomId, {
          type: 'answer',
          senderId: this.currentUser.id.toString(),
          data: answer
        });
        console.log('-> ANSWER envoyée.');
      } else if (msg.type === 'answer') {
        console.log('-> ANSWER reçue, finalisation de la connexion.');
        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(msg.data));
      } else if (msg.type === 'ice-candidate') {
        if (this.peerConnection && msg.data && msg.data.candidate) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(msg.data));
          console.log('-> ICE Candidate ajouté avec succès.');
        }
      }
    } catch (e) {
      console.error('Erreur lors du traitement du signal WebRTC:', e);
>>>>>>> Stashed changes
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
