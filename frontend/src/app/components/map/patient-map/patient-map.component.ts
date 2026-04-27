import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { MapService } from '../../../services/map.service';
import { LocationPrediction, LocationRecognitionService } from '../../../services/location-recognition.service';

type AppStatus = 'starting' | 'tracking' | 'sos' | 'error' | 'offline';

@Component({
  selector: 'app-patient-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-map.component.html',
  styleUrl: './patient-map.component.css'
})
export class PatientMapComponent implements OnInit, OnDestroy {

  status: AppStatus = 'starting';
  batterie          = 100;
  gpsActif          = false;
  sosEnvoye         = false;
  erreurMessage     = '';
  lastUpdate: Date | null = null;
  currentUser: any  = {};
  positionsEnvoyees = 0;
  sosCountdown      = 0;
  locationResult: LocationPrediction | null = null;
  locationPhotoPreview: string | null = null;
  locationAnalysisLoading = false;
  locationAnalysisError = '';

  private gpsInterval:     any = null;
  private wakeLock:        any = null;
  private watchId:         number | null = null;
  private sosTimer:        any = null;
  private currentPosition: GeolocationPosition | null = null;

  constructor(
    private authService: AuthService,
    private mapService: MapService,
    private locationRecognitionService: LocationRecognitionService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (isPlatformBrowser(this.platformId)) {
      this.init();
    }
  }

  ngOnDestroy(): void {
    this.stopAll();
  }

  // ===== INITIALISATION =====
  private async init(): Promise<void> {
    this.status = 'starting';
    await this.requestWakeLock();
    this.startBatterieMonitor();
    this.startGPS();
  }

  // ===== WAKE LOCK — garde l'écran allumé =====
  private async requestWakeLock(): Promise<void> {
    try {
      const nav = navigator as any;
      if ('wakeLock' in nav) {
        this.wakeLock = await nav.wakeLock.request('screen');
        // Réactive le wake lock si la page redevient visible
        document.addEventListener('visibilitychange', async () => {
          if (document.visibilityState === 'visible' && this.wakeLock === null) {
            this.wakeLock = await nav.wakeLock.request('screen');
          }
        });
      }
    } catch (err) {
      console.log('Wake Lock non supporté');
    }
  }

  // ===== GPS =====
  startGPS(): void {
    if (!navigator.geolocation) {
      this.erreurMessage = 'GPS non disponible';
      this.status = 'error';
      return;
    }

    // Surveillance continue de la position
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.currentPosition = pos;
        this.gpsActif        = true;
        if (this.status === 'starting') {
          this.status = 'tracking';
        }
      },
      (err) => {
        this.gpsActif = false;
        this.status   = 'offline';
        console.warn('GPS:', err.message);
      },
      {
        enableHighAccuracy: true,
        timeout:            15000,
        maximumAge:         5000
      }
    );

    // Envoi immédiat
    this.sendPosition();

    // Envoi toutes les 30 secondes
    this.gpsInterval = setInterval(() => {
      this.sendPosition();
    }, 30000);
  }

  private sendPosition(): void {
    if (!this.currentPosition) {
      // Essaie de récupérer la position manuellement
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.currentPosition = pos;
          this.sendToServer(pos);
        },
        (err) => {
          this.gpsActif = false;
          this.status   = 'offline';
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
      return;
    }
    this.sendToServer(this.currentPosition);
  }

  private sendToServer(pos: GeolocationPosition): void {
    const userId = this.currentUser.userId || this.currentUser.id;
    if (!userId) return;

    this.mapService.sendLocation(
      userId,
      pos.coords.latitude,
      pos.coords.longitude,
      this.batterie
    ).subscribe({
      next: () => {
        this.lastUpdate       = new Date();
        this.gpsActif         = true;
        this.positionsEnvoyees++;
        this.status           = 'tracking';
      },
      error: () => {
        this.gpsActif = false;
        this.status   = 'offline';
      }
    });
  }

  // ===== SOS =====
  envoiSOS(): void {
  if (this.sosEnvoye) return;

  this.sosEnvoye    = true;
  this.status       = 'sos';
  this.sosCountdown = 30;

  const userId = this.currentUser.userId || this.currentUser.id;

  // 1. Envoie position
  this.sendPosition();

  // 2. Envoie alerte SOS
  this.mapService.sendSOS(
    userId,
    this.currentPosition?.coords.latitude,
    this.currentPosition?.coords.longitude
  ).subscribe({
    next: () => console.log('✅ SOS envoyé !'),
    error: (err) => console.error('❌ SOS erreur:', err)
  });

  // Compte à rebours
  this.sosTimer = setInterval(() => {
    this.sosCountdown--;
    if (this.sosCountdown <= 0) this.resetSOS();
  }, 1000);
}

  resetSOS(): void {
    this.sosEnvoye    = false;
    this.sosCountdown = 0;
    this.status       = 'tracking';
    if (this.sosTimer) {
      clearInterval(this.sosTimer);
      this.sosTimer = null;
    }
  }

  openLocationCamera(): void {
    this.router.navigate(['/location-capture']);
  }

  onLocationPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const image = reader.result as string;
      this.locationPhotoPreview = image;
      this.analyzeLocationPhoto(image);
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  private analyzeLocationPhoto(image: string): void {
    const patientId = Number(this.currentUser.userId || this.currentUser.id);
    if (!patientId) {
      this.locationAnalysisError = 'Identifiant patient introuvable.';
      return;
    }

    this.locationAnalysisLoading = true;
    this.locationAnalysisError = '';
    this.locationResult = null;

    this.locationRecognitionService.predict({
      image,
      patientId,
      reporterId: patientId
    }).subscribe({
      next: (result) => {
        this.locationResult = result;
        this.locationAnalysisLoading = false;
      },
      error: (err) => {
        this.locationAnalysisError = err?.error?.detail || err?.error?.message || 'Analyse de lieu impossible.';
        this.locationAnalysisLoading = false;
      }
    });
  }

  get locationIsUnknown(): boolean {
    return this.locationResult?.statut === 'ZONE_INCONNUE';
  }

  // ===== BATTERIE =====
  private startBatterieMonitor(): void {
    const nav = navigator as any;
    if (nav.getBattery) {
      nav.getBattery().then((battery: any) => {
        this.batterie = Math.round(battery.level * 100);
        battery.addEventListener('levelchange', () => {
          this.batterie = Math.round(battery.level * 100);
          // Alerte batterie faible — envoie une position immédiatement
          if (this.batterie === 20 || this.batterie === 10) {
            this.sendPosition();
          }
        });
      }).catch(() => {
        this.batterie = 100;
      });
    }
  }

  // ===== UTILS =====
  get batterieColor(): string {
    if (this.batterie < 20) return '#dc3545';
    if (this.batterie < 50) return '#ffc107';
    return '#28a745';
  }

  get batterieIcon(): string {
    if (this.batterie < 20) return 'fa-battery-quarter';
    if (this.batterie < 50) return 'fa-battery-half';
    if (this.batterie < 80) return 'fa-battery-three-quarters';
    return 'fa-battery-full';
  }

  get statusMessage(): string {
    switch (this.status) {
      case 'starting':  return 'Démarrage du GPS...';
      case 'tracking':  return 'GPS actif — vous êtes suivi';
      case 'sos':       return 'Alerte envoyée !';
      case 'offline':   return 'GPS hors ligne';
      case 'error':     return this.erreurMessage;
      default:          return '';
    }
  }

  get nextSendIn(): string {
    if (!this.lastUpdate) return '';
    const elapsed = Math.floor((Date.now() - this.lastUpdate.getTime()) / 1000);
    const remaining = Math.max(0, 30 - elapsed);
    return `${remaining}s`;
  }

  stopAll(): void {
    if (this.gpsInterval) clearInterval(this.gpsInterval);
    if (this.sosTimer)    clearInterval(this.sosTimer);
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
  }

  logout(): void {
    this.stopAll();
    this.authService.logout();
  }

  
}
