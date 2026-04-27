import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { LocationPrediction, LocationRecognitionService } from '../../services/location-recognition.service';

@Component({
  selector: 'app-location-capture',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-capture.component.html',
  styleUrl: './location-capture.component.css'
})
export class LocationCaptureComponent implements OnInit, OnDestroy {
  @ViewChild('video', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  currentUser: any = {};
  result: LocationPrediction | null = null;
  errorMessage = '';
  cameraReady = false;
  sending = false;
  lastCaptureAt: Date | null = null;

  private stream: MediaStream | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private wakeLock: any = null;
  private readonly isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private locationService: LocationRecognitionService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit(): Promise<void> {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser?.role !== 'PATIENT') {
      this.errorMessage = 'Cette surveillance est reservee au profil patient.';
      return;
    }

    if (!this.isBrowser) {
      return;
    }

    await this.requestWakeLock();
    await this.openCamera();
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.stream?.getTracks().forEach(track => track.stop());
    this.wakeLock?.release?.();
  }

  private async requestWakeLock(): Promise<void> {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      this.wakeLock = null;
    }
  }

  private async openCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      const video = this.videoRef.nativeElement;
      video.srcObject = this.stream;
      await video.play();
      this.cameraReady = true;
      this.captureAndSend();
      this.intervalId = setInterval(() => this.captureAndSend(), 30000);
    } catch {
      this.errorMessage = "Impossible d'ouvrir la camera. Autorisez l'acces camera pour activer AlzCare.";
    }
  }

  private captureAndSend(): void {
    if (!this.cameraReady || this.sending) {
      return;
    }

    const patientId = Number(this.currentUser?.userId ?? this.currentUser?.id);
    if (!patientId) {
      this.errorMessage = 'Identifiant patient introuvable dans la session.';
      return;
    }

    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const context = canvas.getContext('2d');
    if (!context) {
      this.errorMessage = "Capture camera indisponible.";
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/jpeg', 0.82);
    this.sending = true;
    this.errorMessage = '';

    this.locationService.predict({ image, patientId, reporterId: patientId }).subscribe({
      next: response => {
        this.result = response;
        this.lastCaptureAt = new Date();
        this.sending = false;
      },
      error: err => {
        this.errorMessage = err?.error?.message || err?.error?.detail || "Analyse de localisation indisponible.";
        this.sending = false;
      }
    });
  }

  get isUnknown(): boolean {
    return this.result?.statut === 'ZONE_INCONNUE';
  }
}
