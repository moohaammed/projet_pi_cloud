import {
  Component, Input, OnInit, OnDestroy,
  ViewChild, ElementRef, Output, EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoCallService, SignalMessage } from '../../services/videocall.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { AiAgentPanelComponent } from '../ai-agent-panel/ai-agent-panel.component';
import { HandTrackingService, HandGestureEvent } from '../../services/collaboration/hand-tracking.service';

@Component({
  selector: 'app-videocall',
  standalone: true,
  imports: [CommonModule, AiAgentPanelComponent],
  templateUrl: './videocall.component.html',
  styleUrl: './videocall.component.css'
})
export class VideoCallComponent implements OnInit, OnDestroy {
  @Input() roomId: string = '';
  @Output() closeCall = new EventEmitter<void>();

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('drawingCanvas') drawingCanvas!: ElementRef<HTMLCanvasElement>;

  private localStream?: MediaStream;
  private peerConnection?: RTCPeerConnection;
  private subscription?: Subscription;
  private signalSubscription?: Subscription;
  private joinResendTimers: number[] = [];
  private currentUser: any;

  public isMuted = false;
  public isVideoOff = false;
  public connectionStatus = 'Initialisation...';
  public participants: Map<string, string> = new Map();

  // ── Hand Tracking & Drawing ────────────────────────────────────────────────
  public isHandsEnabled = false;
  public zoomFactor = 1.0;
  public mouseX = 0;
  public mouseY = 0;
  public isMouseDown = false;
  private ctx?: CanvasRenderingContext2D;
  private lastX: number | null = null;
  private lastY: number | null = null;

  // ── AI Agent Panel ──────────────────────────────────────────────────────────
  public showAgentPanel = false;

  public toggleAgentPanel(): void {
    this.showAgentPanel = !this.showAgentPanel;
  }

  /** Returns the display name of the remote participant (patient) */
  public getPatientName(): string {
    const first = this.participants.values().next().value;
    return first || 'Patient';
  }

  /** Returns the current user's display name (doctor) */
  public getDoctorName(): string {
    return this.getUserDisplayName();
  }

  // ── WebRTC / Signaling (unchanged) ─────────────────────────────────────────

  private readonly iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  constructor(
    private videoCallService: VideoCallService,
    private authService: AuthService,
    private handTracking: HandTrackingService
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  async ngOnInit() {
    console.log('VC: Initialisation pour la room:', this.roomId);
    this.videoCallService.connect(this.currentUser.id.toString());

    this.subscription = this.videoCallService.isConnected$.subscribe(connected => {
      if (connected) {
        console.log('VC: Connecté au serveur, inscription à la room...');
        this.videoCallService.subscribe(this.roomId);
        this.startLocalStream();
        this.scheduleJoinSignals();
      }
    });

    this.signalSubscription = this.videoCallService.signalMessages$.subscribe(msg => {
      this.handleSignalMessage(msg);
    });

    setTimeout(() => this.initCanvas(), 1000);
  }

  ngOnDestroy() {
    this.clearJoinTimers();
    this.sendLeaveSignal();
    this.hangup();
    this.subscription?.unsubscribe();
    this.signalSubscription?.unsubscribe();
    if (this.roomId) {
      this.videoCallService.unsubscribeFromRoom(this.roomId);
    }
    this.handTracking.stop();
  }

  // ── Shared Drawing Logic ───────────────────────────────────────────────────

  private initCanvas() {
    if (!this.drawingCanvas) return;
    const canvas = this.drawingCanvas.nativeElement;
    
    // Ensure canvas matches its display size in pixels
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    this.ctx = canvas.getContext('2d')!;
    this.ctx.strokeStyle = '#00FF41'; // Matrix neon green for better visibility
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    console.log('VC: Canvas de dessin initialisé', canvas.width, 'x', canvas.height);
  }

  public toggleHands() {
    this.isHandsEnabled = !this.isHandsEnabled;
    if (!this.isHandsEnabled) {
      this.handTracking.stop();
    }
    // Mouse mode is active when isHandsEnabled is true, no need for camera init.
  }

  private async startHandTracking() {
    if (!this.localVideo) return;
    await this.handTracking.initialize(this.localVideo.nativeElement, (results) => {
      const gesture = this.handTracking.detectGesture(results);
      this.handleLocalGesture(gesture);
    });
  }

  public onMouseDown(event: MouseEvent) {
    this.isMouseDown = true;
    this.handleMouseMove(event);
  }

  public onMouseMove(event: MouseEvent) {
    const canvas = this.drawingCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.mouseX = event.clientX - rect.left;
    this.mouseY = event.clientY - rect.top;

    if (this.isMouseDown) {
      const normalizedX = this.mouseX / canvas.width;
      const normalizedY = this.mouseY / canvas.height;
      this.drawOnCanvas(normalizedX, normalizedY, true);
    }
  }

  public onMouseUp() {
    this.isMouseDown = false;
    this.lastX = null;
    this.lastY = null;
  }

  private handleMouseMove(event: MouseEvent) {
    this.onMouseMove(event);
  }

  private handleLocalGesture(event: any) {
    // Keep for potential legacy use or removed
  }

  private drawOnCanvas(normalizedX: number, normalizedY: number, isLocal: boolean, isEraser: boolean = false, weight: number = 4) {
    if (!this.ctx || !this.drawingCanvas) return;
    
    const canvas = this.drawingCanvas.nativeElement;
    const x = normalizedX * canvas.width;
    const y = normalizedY * canvas.height;

    this.ctx.lineWidth = isEraser ? 30 : (weight * 3);
    this.ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    this.ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : '#00FF41';

    if (this.lastX !== null && this.lastY !== null) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    }
    
    this.lastX = x;
    this.lastY = y;

    if (isLocal) {
      this.videoCallService.sendSignal(this.roomId, {
        type: 'draw-event',
        senderId: this.currentUser.id.toString(),
        data: { 
          draw: { x: normalizedX, y: normalizedY },
          erase: isEraser,
          weight: weight
        }
      });
    }
  }

  public clearCanvas(isLocal: boolean) {
    if (!this.ctx || !this.drawingCanvas) return;
    const canvas = this.drawingCanvas.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.lastX = null;
    this.lastY = null;

    if (isLocal) {
      this.videoCallService.sendSignal(this.roomId, {
        type: 'draw-event',
        senderId: this.currentUser.id.toString(),
        data: { clear: true }
      });
    }
  }

  private applyZoom(isBigger: boolean, isLocal: boolean) {
    if (isBigger) this.zoomFactor += 0.05;
    else this.zoomFactor -= 0.05;
    
    this.zoomFactor = Math.max(0.2, Math.min(5, this.zoomFactor));

    if (isLocal) {
      this.videoCallService.sendSignal(this.roomId, {
        type: 'draw-event',
        senderId: this.currentUser.id.toString(),
        data: { zoom: this.zoomFactor }
      });
    }
  }

  private scheduleJoinSignals(): void {
    this.clearJoinTimers();
    const delays = [120, 700, 2200];
    delays.forEach((ms) => {
      const id = window.setTimeout(() => {
        console.log('VC: Envoi du signal JOIN (retry cadence)');
        this.sendJoinSignal();
      }, ms);
      this.joinResendTimers.push(id);
    });
  }

  private clearJoinTimers(): void {
    this.joinResendTimers.forEach((t) => window.clearTimeout(t));
    this.joinResendTimers = [];
  }

  private getUserDisplayName(): string {
    if (!this.currentUser) return 'Utilisateur inconnu';
    return this.currentUser.nom || this.currentUser.firstName || this.currentUser.username || this.currentUser.email || 'Utilisateur';
  }

  private sendJoinSignal() {
    const senderId = this.currentUser?.id ? this.currentUser.id.toString() : Math.random().toString(36).substring(7);
    this.videoCallService.sendSignal(this.roomId, {
      type: 'join',
      senderId: senderId,
      data: { name: this.getUserDisplayName() }
    });
  }

  private sendLeaveSignal() {
    const senderId = this.currentUser?.id ? this.currentUser.id.toString() : 'unknown';
    this.videoCallService.sendSignal(this.roomId, {
      type: 'leave',
      senderId: senderId,
      data: {}
    });
  }

  private processJoin(msg: SignalMessage) {
    const myId = this.currentUser?.id ? this.currentUser.id.toString() : '';
    if (String(msg.senderId) === String(myId)) return;

    let dataObj = msg.data;
    if (typeof msg.data === 'string') {
      try { dataObj = JSON.parse(msg.data); } catch (e) { }
    }

    const name = dataObj?.name || `Utilisateur ${msg.senderId}`;
    this.participants.set(msg.senderId, name);
    console.log(`VC: ${name} est maintenant en ligne.`);

    if (msg.type === 'join') {
      console.log('VC: Réponse JOIN-REPLY à', msg.senderId);
      this.videoCallService.sendSignal(this.roomId, {
        type: 'join-reply',
        senderId: myId,
        data: { name: this.getUserDisplayName() }
      });
    }
  }

  private async startLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (e) {
      console.warn('VC: Erreur caméra, repli micro seul...', e);
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        this.isVideoOff = true;
      } catch (e2) {
        console.error('VC: Accès média impossible !');
        this.connectionStatus = 'Erreur: Accès refusé';
        return;
      }
    }

    if (this.localStream) {
      if (this.localVideo) this.localVideo.nativeElement.srcObject = this.localStream;
      this.connectionStatus = 'Prêt';
    }
  }

  private createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.iceServers);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const senderId = this.currentUser?.id ? this.currentUser.id.toString() : 'unknown';
        this.videoCallService.sendSignal(this.roomId, {
          type: 'ice-candidate',
          senderId: senderId,
          data: event.candidate
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('VC: --- Flux audio/vidéo distant reçu ! ---');
      if (this.remoteVideo) {
        this.remoteVideo.nativeElement.srcObject = event.streams[0];
        this.remoteVideo.nativeElement.volume = 1.0;
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
    console.log('VC: --- Initiation de l\'appel WebRTC ---');
    this.createPeerConnection();
    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);

    const senderId = this.currentUser?.id ? this.currentUser.id.toString() : 'unknown';
    this.videoCallService.sendSignal(this.roomId, {
      type: 'offer',
      senderId: senderId,
      data: offer
    });
    this.connectionStatus = 'Appel en cours...';
  }

  private async handleSignalMessage(msg: SignalMessage) {
    const myId = this.currentUser?.id ? this.currentUser.id.toString() : '';
    if (!msg || String(msg.senderId) === String(myId)) return;
    if (msg.type === 'messenger-invite') return;

    console.log('VC REÇU:', msg.type);

    let dataPayload = msg.data;
    if (typeof msg.data === 'string' && (msg.type === 'offer' || msg.type === 'answer' || msg.type === 'ice-candidate')) {
      try { dataPayload = JSON.parse(msg.data); } catch (e) { }
    }

    try {
      if (msg.type === 'join' || msg.type === 'join-reply') {
        this.processJoin(msg);
      } else if (msg.type === 'leave') {
        this.participants.delete(msg.senderId);
      } else if (msg.type === 'offer') {
        console.log('VC: Réception OFFER, envoi ANSWER...');
        this.createPeerConnection();
        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(dataPayload));
        const answer = await this.peerConnection!.createAnswer();
        await this.peerConnection!.setLocalDescription(answer);
        this.videoCallService.sendSignal(this.roomId, {
          type: 'answer',
          senderId: myId,
          data: answer
        });
      } else if (msg.type === 'answer') {
        console.log('VC: Réception ANSWER, connexion établie.');
        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(dataPayload));
      } else if (msg.type === 'ice-candidate') {
        if (this.peerConnection && dataPayload && dataPayload.candidate) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(dataPayload));
        }
      } else if (msg.type === 'draw-event') {
        const drawData = dataPayload;
        if (drawData.draw) {
          this.drawOnCanvas(drawData.draw.x, drawData.draw.y, false, drawData.erase, drawData.weight);
        } else if (drawData.clear) {
          this.clearCanvas(false);
        } else if (drawData.zoom) {
          this.zoomFactor = drawData.zoom;
        }
      }
    } catch (e) {
      console.error('VC RTC Error:', e);
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