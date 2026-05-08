import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { MapService } from '../../services/map.service';
import { AlzUserService } from '../../services/alz-user.service';
import { AuthService } from '../../services/auth.service';
import { HospitalPredictionService, RecommendedHospital } from '../../services/hospital-prediction.service';
import { IncidentService, Incident } from '../../services/incident.service';
import { SafeZone, GeoAlert, PatientLocation } from '../../models/map.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-relation-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './relation-map.component.html',
  styles: [`
    @keyframes pulseRing {
      0%   { transform: scale(1);   opacity: 1; }
      100% { transform: scale(2.5); opacity: 0; }
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
  `]
})
export class RelationMapComponent implements OnInit, AfterViewInit, OnDestroy {

  // ── Carte ────────────────────────────────────────────────────────────────
  private map!: L.Map;
  private patientMarker:   L.Marker  | null = null;
  private greenCircle:     L.Circle  | null = null;
  private redCircle:       L.Circle  | null = null;
  private houseMarker:     L.Marker  | null = null;
  private historyLayer:    L.Polyline | null = null;
  private historyStart:    L.Marker  | null = null;
  private historyEnd:      L.Marker  | null = null;
  private hospitalMarkers: L.Marker[] = [];
  private incidentMarkers: L.Marker[] = [];
  private addIncidentDraftMarker: L.Marker | null = null;

  // ── Données ──────────────────────────────────────────────────────────────
  currentUser:     User | null     = null;
  patient:         User | null     = null;
  lastLocation:    PatientLocation | null = null;
  zone:            SafeZone | null = null;
  alerts:          GeoAlert[]      = [];
  incidents:       Incident[]      = [];
  hospitals:       RecommendedHospital[] = [];
  history:         PatientLocation[] = [];
  lastLocationAddress = 'Address unavailable';
  private addressCache: Record<string, string> = {};
  private lastHospitalLocationKey = '';

  // ── UI ───────────────────────────────────────────────────────────────────
  activeTab:      'info' | 'alerts' | 'incidents' | 'history' = 'info';
  showHistory     = false;
  historyLoading  = false;
  loadingLocation = true;
  isOnline        = false;
  addingIncident = false;
  showIncidentPanel = false;
  savingIncident = false;
  panelAnalyzing = false;
  panelClipError: string | null = null;
  incidentCreateError: string | null = null;

  newIncident = this.emptyIncident();

  readonly incidentTypes = [
    { value: 'TROU', label: 'Hole', emoji: '🕳️', color: '#dc3545' },
    { value: 'OBSTACLE', label: 'Obstacle', emoji: '🚧', color: '#fd7e14' },
    { value: 'ESCALIER', label: 'Stairs', emoji: '🪜', color: '#ffc107' },
    { value: 'ACCIDENT', label: 'Accident', emoji: '🚨', color: '#6f42c1' },
    { value: 'CHUTE_PERSONNE', label: 'Fall', emoji: '🆘', color: '#e83e8c' },
    { value: 'INCENDIE', label: 'Fire', emoji: '🔥', color: '#fd7e14' },
    { value: 'INONDATION', label: 'Flood', emoji: '🌊', color: '#0dcaf0' },
    { value: 'ZONE_DANGEREUSE', label: 'Danger zone', emoji: '⚠️', color: '#6f42c1' },
    { value: 'AUTRE', label: 'Other', emoji: '⚠️', color: '#6c757d' },
  ];

  private refreshInterval: any;
  private readonly CLIP_URL    = 'http://localhost:8000/predict';
  private readonly REFRESH_MS  = 15000;

  constructor(
    private mapService:      MapService,
    private alzUserService:  AlzUserService,
    private authService:     AuthService,
    private hospitalPredictionService: HospitalPredictionService,
    private incidentService: IncidentService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.refreshInterval = setInterval(() => this.refreshPosition(), this.REFRESH_MS);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
      this.loadLinkedPatient();
    }, 300);
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshInterval);
    this.addIncidentDraftMarker?.remove();
    this.map?.remove();
  }

  // ═══════════════════════════════════════
  // INIT CARTE
  // ═══════════════════════════════════════
  private initMap(): void {
    this.map = L.map('relation-map', { center: [36.8065, 10.1815], zoom: 14 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19
    }).addTo(this.map);
  }

  // ═══════════════════════════════════════
  // PATIENT LIÉ À LA RELATION
  // ═══════════════════════════════════════
  private loadLinkedPatient(): void {
    if (!this.currentUser?.id) return;

    // Récupère le patient lié à cette relation via le service
    this.alzUserService.getLinkedPatient(this.currentUser.id).subscribe({
      next: (patient) => {
        this.patient = patient;
        this.loadAll();
      },
      error: () => {
        // Fallback : essayer via patientId stocké dans le profil
        const patientId = (this.currentUser as any)?.patientId;
        if (patientId) {
          this.alzUserService.getById(patientId).subscribe({
            next: (p) => { this.patient = p; this.loadAll(); },
            error: () => console.error('Patient not found')
          });
        }
      }
    });
  }

  private loadAll(): void {
    if (!this.patient?.id) return;
    this.refreshPosition();
    this.loadZone();
    this.loadAlerts();
    this.loadIncidents();
  }

  // ═══════════════════════════════════════
  // POSITION EN TEMPS RÉEL
  // ═══════════════════════════════════════
  refreshPosition(): void {
    if (!this.patient?.id) return;

    this.mapService.getLastLocation(this.patient.id).subscribe({
      next: (loc) => {
        this.loadingLocation = false;
        this.isOnline        = true;
        this.lastLocation    = loc;
        this.loadAddressForLocation(loc);
        this.updatePatientMarker(loc);
        this.loadDatasetHospitals(loc);
      },
      error: () => {
        this.loadingLocation = false;
        this.isOnline        = false;
        this.updateOfflineMarker();
      }
    });
  }

  private updatePatientMarker(loc: PatientLocation): void {
    const batterie = loc.batterie ?? 100;
    const bColor   = batterie < 20 ? '#dc3545' : batterie < 50 ? '#ffc107' : '#28a745';
    const initials = `${this.patient?.nom?.charAt(0) ?? '?'}${this.patient?.prenom?.charAt(0) ?? ''}`;

    const icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative">
          <!-- Anneau pulsant -->
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                      width:42px;height:42px;border-radius:50%;background:rgba(13,110,253,0.25);
                      animation:pulseRing 1.8s ease-out infinite"></div>
          <!-- Avatar -->
          <div style="background:#0d6efd;color:white;border-radius:50%;width:42px;height:42px;
                      display:flex;align-items:center;justify-content:center;
                      font-weight:700;font-size:13px;border:3px solid white;
                      box-shadow:0 2px 10px rgba(13,110,253,0.4);position:relative;z-index:1">
            ${initials}
          </div>
          <!-- Indicateur batterie -->
          <div style="position:absolute;bottom:-2px;right:-2px;background:${bColor};
                      border-radius:50%;width:14px;height:14px;border:2px solid white;
                      font-size:8px;display:flex;align-items:center;justify-content:center;
                      color:white;font-weight:700;z-index:2">
            ${batterie < 20 ? '!' : ''}
          </div>
        </div>`,
      iconSize: [42, 42], iconAnchor: [21, 21]
    });

    this.patientMarker?.remove();
    this.patientMarker = L.marker([loc.latitude, loc.longitude], { icon })
      .bindPopup(`
        <div style="min-width:180px">
          <div style="background:#0d6efd;color:white;padding:8px 12px;
                      margin:-8px -12px 8px;border-radius:4px 4px 0 0">
            <strong>${this.patient?.nom} ${this.patient?.prenom}</strong>
          </div>
          <div style="font-size:13px;padding:4px 0">
            <div style="color:#28a745;font-weight:700">Online</div>
            <div>🔋 <span style="color:${bColor};font-weight:700">${batterie}%</span></div>
            <div style="color:#888;font-size:11px">
              ${loc.timestamp ? new Date(loc.timestamp).toLocaleString('fr') : ''}
            </div>
          </div>
          <a href="https://www.google.com/maps?q=${loc.latitude},${loc.longitude}"
             target="_blank"
             style="display:block;margin-top:6px;padding:4px 8px;background:#0d6efd;
                    color:white;border-radius:6px;text-decoration:none;text-align:center;font-size:12px">
            📍 Ouvrir dans Maps
          </a>
        </div>`)
      .addTo(this.map);

    this.map.setView([loc.latitude, loc.longitude], 15);
  }

  private updateOfflineMarker(): void {
    if (!this.lastLocation) return;
    const initials = `${this.patient?.nom?.charAt(0) ?? '?'}${this.patient?.prenom?.charAt(0) ?? ''}`;
    const icon = L.divIcon({
      className: '',
      html: `<div style="background:#6c757d;color:white;border-radius:50%;width:42px;height:42px;
                         display:flex;align-items:center;justify-content:center;
                         font-weight:700;font-size:13px;border:3px solid white;opacity:0.7">
               ${initials}
             </div>`,
      iconSize: [42, 42], iconAnchor: [21, 21]
    });
    this.patientMarker?.remove();
    this.patientMarker = L.marker(
      [this.lastLocation.latitude, this.lastLocation.longitude], { icon }
    ).bindPopup(`<strong>${this.patient?.nom} ${this.patient?.prenom}</strong><br>
                 <span style="color:#6c757d">Offline</span>`)
     .addTo(this.map);
  }

  centerOnPatient(): void {
    if (this.lastLocation) {
      this.map.setView([this.lastLocation.latitude, this.lastLocation.longitude], 16);
      this.patientMarker?.openPopup();
    }
  }

  // ═══════════════════════════════════════
  // ZONES SÉCURITÉ
  // ═══════════════════════════════════════
  private loadZone(): void {
    if (!this.patient?.id) return;
    this.mapService.getZoneByPatient(this.patient.id).subscribe({
      next: (zones) => {
        this.zone = zones[0] ?? null;
        if (this.zone) this.drawZones(this.zone);
      }
    });
  }

  private getHouseIcon(): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<div style="font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🏠</div>`,
      iconSize: [28, 28], iconAnchor: [14, 28]
    });
  }

  private drawZones(zone: SafeZone): void {
    this.greenCircle?.remove();
    this.redCircle?.remove();
    this.houseMarker?.remove();

    this.greenCircle = L.circle([zone.latitudeCentre, zone.longitudeCentre], {
      radius: zone.rayonVert, color: '#28a745',
      fillColor: '#28a745', fillOpacity: 0.1, weight: 2, dashArray: '5 5'
    }).bindTooltip(`Green zone - ${zone.rayonVert}m`).addTo(this.map);

    this.redCircle = L.circle([zone.latitudeCentre, zone.longitudeCentre], {
      radius: zone.rayonRouge, color: '#dc3545',
      fillColor: '#dc3545', fillOpacity: 0.05, weight: 2, dashArray: '5 5'
    }).bindTooltip(`Red zone - ${zone.rayonRouge}m`).addTo(this.map);

    this.houseMarker = L.marker([zone.latitudeCentre, zone.longitudeCentre], {
      icon: this.getHouseIcon()
    }).bindPopup(`
      <div style="text-align:center">
        <b>Home of ${this.patient?.prenom}</b><br>
        <small style="color:#28a745">Green zone: ${zone.rayonVert}m</small><br>
        <small style="color:#dc3545">Red zone: ${zone.rayonRouge}m</small>
      </div>`).addTo(this.map);
  }

  // ═══════════════════════════════════════
  // ALERTES
  // ═══════════════════════════════════════
  private loadAlerts(): void {
    if (!this.patient?.id) return;
    this.mapService.getAlertsByPatient(this.patient.id).subscribe({
      next: (data) => this.alerts = data.sort(
        (a, b) => new Date(b.declencheeAt ?? 0).getTime() - new Date(a.declencheeAt ?? 0).getTime()
      )
    });
  }

  get unresolvedAlerts(): GeoAlert[] {
    return this.alerts.filter(a => !a.resolue);
  }

  getAlertIcon(type: string): string {
    const icons: Record<string, string> = {
      'HORS_ZONE_ROUGE': 'fa-triangle-exclamation',
      'HORS_ZONE_VERTE': 'fa-circle-exclamation',
      'BATTERIE_FAIBLE': 'fa-battery-quarter',
      'SOS':             'fa-bell',
    };
    return icons[type] ?? 'fa-info-circle';
  }

  getAlertColor(type: string): string {
    return type === 'HORS_ZONE_ROUGE' || type === 'SOS' ? '#dc3545'
         : type === 'HORS_ZONE_VERTE' ? '#fd7e14'
         : '#6c757d';
  }

  // ═══════════════════════════════════════
  // INCIDENTS
  // ═══════════════════════════════════════
  private loadIncidents(): void {
    if (!this.patient?.id) return;
    this.incidentService.getByPatient(this.patient.id).subscribe({
      next: (data) => {
        this.incidents = data;
        this.drawIncidentMarkers(data);
      }
    });
  }

  private drawIncidentMarkers(incidents: Incident[]): void {
    this.incidentMarkers.forEach(m => m.remove());
    this.incidentMarkers = [];

    incidents.forEach(inc => {
      if (!inc.latitude || !inc.longitude) return;
      const color = this.incidentColor(inc.type);
      const emoji = this.incidentEmoji(inc.type);

      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${color};color:white;border-radius:50%;
                           width:32px;height:32px;display:flex;align-items:center;
                           justify-content:center;border:2px solid white;
                           box-shadow:0 2px 6px rgba(0,0,0,.3);font-size:14px">
                 ${emoji}
               </div>`,
        iconSize: [32, 32], iconAnchor: [16, 16]
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon })
        .bindPopup(`
          <div style="min-width:160px">
            <div style="background:${color};color:white;padding:6px 10px;
                        margin:-8px -12px 8px;border-radius:4px 4px 0 0">
              <strong>${emoji} ${inc.title}</strong>
            </div>
            <div style="font-size:12px">
              <div><b>Type :</b> ${inc.type}</div>
              <div><b>Statut :</b>
                <span style="color:${inc.status === 'EN_COURS' ? '#dc3545' : '#28a745'}">
                  ${inc.status}
                </span>
              </div>
              <div style="color:#888;font-size:10px;margin-top:4px">
                ${inc.createdAt ? new Date(inc.createdAt).toLocaleString('fr') : ''}
              </div>
            </div>
          </div>`)
        .addTo(this.map);
      this.incidentMarkers.push(marker);
    });
  }

  focusIncident(inc: Incident): void {
    if (!inc.latitude || !inc.longitude) return;
    this.map.setView([inc.latitude, inc.longitude], 17);
    const marker = this.incidentMarkers.find(
      m => Math.abs(m.getLatLng().lat - inc.latitude!) < 0.0001
    );
    marker?.openPopup();
  }

  get activeIncidents(): Incident[] {
    return this.incidents.filter(i => i.status === 'EN_COURS');
  }

  startAddIncident(): void {
    this.activeTab = 'incidents';
    this.newIncident = {
      ...this.emptyIncident(),
      patientId: this.patient?.id ?? null,
      latitude: this.lastLocation?.latitude ?? null,
      longitude: this.lastLocation?.longitude ?? null
    };
    this.showIncidentPanel = true;
    this.addingIncident = !this.lastLocation;
    this.incidentCreateError = null;
    this.panelClipError = null;

    if (this.lastLocation) {
      this.placeIncidentDraftMarker(this.lastLocation.latitude, this.lastLocation.longitude);
      return;
    }

    this.map.getContainer().style.cursor = 'crosshair';
    this.map.once('click', (e: L.LeafletMouseEvent) => {
      this.placeIncidentDraftMarker(e.latlng.lat, e.latlng.lng);
    });
  }

  repositionIncidentMarker(): void {
    this.addingIncident = true;
    this.addIncidentDraftMarker?.remove();
    this.addIncidentDraftMarker = null;
    this.map.getContainer().style.cursor = 'crosshair';
    this.map.once('click', (e: L.LeafletMouseEvent) => {
      this.placeIncidentDraftMarker(e.latlng.lat, e.latlng.lng);
    });
  }

  private placeIncidentDraftMarker(lat: number, lng: number): void {
    this.newIncident.latitude = lat;
    this.newIncident.longitude = lng;
    this.addingIncident = false;
    this.map.getContainer().style.cursor = '';

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:40px;height:40px;background:linear-gradient(135deg,#6f42c1,#3c3489);
                         border-radius:50% 50% 50% 4px;transform:rotate(-45deg);
                         border:3px solid white;box-shadow:0 4px 14px rgba(111,66,193,.55);
                         display:flex;align-items:center;justify-content:center;font-size:16px">
               <span style="transform:rotate(45deg)">📍</span>
             </div>`,
      iconSize: [40, 40], iconAnchor: [20, 40]
    });

    this.addIncidentDraftMarker?.remove();
    this.addIncidentDraftMarker = L.marker([lat, lng], { icon, draggable: true, zIndexOffset: 2000 })
      .bindTooltip('Glissez pour repositionner')
      .addTo(this.map);

    this.addIncidentDraftMarker.on('drag', (e: any) => {
      const ll = e.target.getLatLng();
      this.newIncident.latitude = ll.lat;
      this.newIncident.longitude = ll.lng;
    });

    this.map.panTo([lat, lng]);
  }

  cancelAddIncident(): void {
    this.addingIncident = false;
    this.showIncidentPanel = false;
    this.savingIncident = false;
    this.panelAnalyzing = false;
    this.panelClipError = null;
    this.incidentCreateError = null;
    this.map.getContainer().style.cursor = '';
    this.addIncidentDraftMarker?.remove();
    this.addIncidentDraftMarker = null;
    this.map.off('click');
  }

  onTypeSelected(type: { value: string; label: string; emoji: string; color: string }): void {
    this.newIncident.type = type.value;
    if (!this.newIncident.title) this.newIncident.title = this.typeToTitle(type.value);
    if (!this.newIncident.description) this.newIncident.description = this.typeToDescription(type.value);
  }

  onIncidentPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      this.newIncident.media = base64;
      this.newIncident.mediaPreview = base64;
      this.runPanelClipAnalysis(base64);
    };
    reader.readAsDataURL(file);
  }

  private runPanelClipAnalysis(base64: string): void {
    this.panelAnalyzing = true;
    this.panelClipError = null;
    fetch(this.CLIP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: base64 })
    })
      .then(response => response.json())
      .then((data: any) => {
        this.panelAnalyzing = false;
        if (data.error) {
          this.panelClipError = data.error;
          return;
        }
        const label = data.label as string;
        const confidence = data.confidence as number;
        const type = this.clipLabelToType(label);
        this.newIncident.aiAnalysis = label;
        this.newIncident.aiConfidence = confidence;
        this.newIncident.type = type;
        this.newIncident.title = this.typeToTitle(type);
        this.newIncident.description = this.typeToDescription(type);
      })
      .catch(() => {
        this.panelAnalyzing = false;
        this.panelClipError = 'Serveur IA indisponible. Choisissez le type manuellement.';
      });
  }

  saveNewIncident(): void {
    if (!this.currentUser?.id || !this.patient?.id) {
      this.incidentCreateError = 'Patient or relation not found.';
      return;
    }
    if (!this.newIncident.latitude || !this.newIncident.longitude || !this.newIncident.type) {
      this.incidentCreateError = 'Veuillez placer l incident et choisir son type.';
      return;
    }

    this.savingIncident = true;
    this.incidentCreateError = null;

    const payload: any = {
      reporterId: this.currentUser.id,
      patientId: this.patient.id,
      aiAnalysis: this.newIncident.aiAnalysis || this.newIncident.type,
      aiConfidence: this.newIncident.aiConfidence ?? 1,
      latitude: this.newIncident.latitude,
      longitude: this.newIncident.longitude,
      media: this.newIncident.media,
      type: this.newIncident.type,
      title: this.newIncident.title || this.typeToTitle(this.newIncident.type),
      description: this.newIncident.description || this.typeToDescription(this.newIncident.type)
    };

    this.incidentService.create(payload).subscribe({
      next: () => {
        this.savingIncident = false;
        this.cancelAddIncident();
        this.loadIncidents();
      },
      error: () => {
        this.savingIncident = false;
        this.incidentCreateError = 'Erreur lors de la creation de l incident.';
      }
    });
  }

  // ═══════════════════════════════════════
  // HISTORIQUE OSRM
  // ═══════════════════════════════════════
  toggleHistory(): void {
    this.showHistory = !this.showHistory;
    if (!this.patient?.id) return;
    if (this.showHistory) {
      this.mapService.getHistory(this.patient.id).subscribe({
        next: (data) => {
          this.history = data;
          data.slice(0, 5).forEach(loc => this.loadAddressForLocation(loc));
          this.drawRouteHistory(data);
        }
      });
    } else {
      this.historyLayer?.remove();
      this.historyStart?.remove();
      this.historyEnd?.remove();
      this.historyLayer = null;
      this.historyStart = null;
      this.historyEnd   = null;
      this.historyLoading = false;
    }
  }

  private drawRouteHistory(locations: PatientLocation[]): void {
    this.historyLayer?.remove();
    this.historyStart?.remove();
    this.historyEnd?.remove();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = locations.filter(
      l => l.timestamp && new Date(l.timestamp) >= sevenDaysAgo
    );
    if (recent.length < 2) return;

    // Échantillonnage max 50 points
    const step    = Math.max(1, Math.floor(recent.length / 50));
    const sampled = recent.filter((_, i) => i % step === 0);
    if (sampled[sampled.length - 1] !== recent[recent.length - 1]) {
      sampled.push(recent[recent.length - 1]);
    }

    const coords  = sampled.map(l => `${l.longitude},${l.latitude}`).join(';');
    const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${coords}?overview=full&geometries=geojson`;

    this.historyLoading = true;

    fetch(osrmUrl)
      .then(r => r.json())
      .then((data: any) => {
        this.historyLoading = false;
        if (data.code === 'Ok' && data.routes?.length > 0) {
          const pts = data.routes[0].geometry.coordinates
            .map(([lng, lat]: [number, number]) => L.latLng(lat, lng));

          this.historyLayer = L.polyline(pts, {
            color: '#0d6efd', weight: 5, opacity: 0.85
          }).addTo(this.map);

          // Départ
          this.historyStart = L.marker(L.latLng(sampled[0].latitude, sampled[0].longitude), {
            icon: L.divIcon({
              className: '',
              html: `<div style="background:#6f42c1;color:white;border-radius:50%;
                                 width:22px;height:22px;border:3px solid white;
                                 display:flex;align-items:center;justify-content:center;
                                 font-size:10px;font-weight:700;
                                 box-shadow:0 2px 6px rgba(0,0,0,.3)">D</div>`,
              iconSize: [22, 22], iconAnchor: [11, 11]
            })
          }).bindTooltip('Start').addTo(this.map);

          // Arrivée
          this.historyEnd = L.marker(
            L.latLng(sampled[sampled.length-1].latitude, sampled[sampled.length-1].longitude), {
            icon: L.divIcon({
              className: '',
              html: `<div style="background:#28a745;color:white;border-radius:50%;
                                 width:22px;height:22px;border:3px solid white;
                                 display:flex;align-items:center;justify-content:center;
                                 font-size:10px;font-weight:700;
                                 box-shadow:0 2px 6px rgba(0,0,0,.3)">A</div>`,
              iconSize: [22, 22], iconAnchor: [11, 11]
            })
          }).bindTooltip('End').addTo(this.map);

          this.map.fitBounds(this.historyLayer.getBounds(), { padding: [50, 50] });
        } else {
          this.drawStraightFallback(recent);
        }
      })
      .catch(() => { this.historyLoading = false; this.drawStraightFallback(recent); });
  }

  private drawStraightFallback(recent: PatientLocation[]): void {
    const pts = recent.map(l => L.latLng(l.latitude, l.longitude));
    this.historyLayer = L.polyline(pts, {
      color: '#0d6efd', weight: 3, opacity: 0.7, dashArray: '6 4'
    }).addTo(this.map);
    this.map.fitBounds(this.historyLayer.getBounds(), { padding: [40, 40] });
  }

  getHistoryStats(): { total: number; distance: string } {
    if (this.history.length < 2) return { total: 0, distance: '0' };
    let dist = 0;
    for (let i = 1; i < this.history.length; i++) {
      dist += this.haversine(
        this.history[i-1].latitude, this.history[i-1].longitude,
        this.history[i].latitude,   this.history[i].longitude
      );
    }
    return { total: this.history.length, distance: (dist / 1000).toFixed(1) };
  }

  private haversine(la1: number, lo1: number, la2: number, lo2: number): number {
    const R = 6371000, r = Math.PI / 180;
    const a = Math.sin((la2-la1)*r/2)**2
            + Math.cos(la1*r) * Math.cos(la2*r) * Math.sin((lo2-lo1)*r/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // ═══════════════════════════════════════
  // HÔPITAUX
  // ═══════════════════════════════════════
  private loadDatasetHospitals(loc: PatientLocation): void {
    const key = `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;
    if (this.lastHospitalLocationKey === key && this.hospitals.length > 0) return;

    this.lastHospitalLocationKey = key;
    this.hospitalPredictionService.searchDataset('', loc.latitude, loc.longitude).subscribe({
      next: (data) => {
        this.hospitals = (data || []).slice(0, 3);
        this.drawHospitalMarkers(this.hospitals);
      },
      error: () => {
        this.hospitals = [];
        this.clearHospitalMarkers();
      }
    });
  }

  private clearHospitalMarkers(): void {
    this.hospitalMarkers.forEach(marker => marker.remove());
    this.hospitalMarkers = [];
  }

  private drawHospitalMarkers(hospitals: RecommendedHospital[]): void {
    this.clearHospitalMarkers();
    hospitals.forEach((h, index) => {
      if (!h.latitude || !h.longitude) return;
      const recommended = index === 0 || h.recommande;
      const color = recommended ? '#198754' : '#6f42c1';
      const distance = this.hospitalDistance(h);
      const mapsUrl = this.hospitalMapsUrl(h);
      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative">
                 <div style="background:${color};color:white;border-radius:10px;
                             width:34px;height:34px;display:flex;align-items:center;
                             justify-content:center;font-size:15px;
                             border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,.28)">
                   <i class="fa-solid fa-hospital"></i>
                 </div>
                 ${recommended ? `<div style="position:absolute;right:-3px;top:-4px;background:#ffc107;
                                      color:#111;border-radius:999px;width:14px;height:14px;
                                      display:flex;align-items:center;justify-content:center;
                                      font-size:9px;font-weight:800;border:1px solid white">1</div>` : ''}
               </div>`,
        iconSize: [34, 34], iconAnchor: [17, 17]
      });
      const m = L.marker([h.latitude, h.longitude], { icon })
        .bindPopup(`<b>${recommended ? 'Recommended - ' : ''}${h.nom}</b>
          <br><small>${h.adresse}${h.gouvernorat ? `, ${h.gouvernorat}` : ''}</small>
          <br><small><b>Specialite :</b> ${h.specialite || 'general'}</small>
          ${distance ? `<br><small><b>Distance :</b> ${distance} km</small>` : ''}
          ${h.telephone ? `<br><small>Tel : ${h.telephone}</small>` : ''}
          <br><a href="${mapsUrl}"
                 target="_blank"
                 style="display:block;margin-top:6px;padding:3px 8px;background:${color};
                        color:white;border-radius:4px;text-decoration:none;text-align:center;font-size:11px">
            Directions
          </a>`)
        .addTo(this.map);
      this.hospitalMarkers.push(m);
    });
  }

  get nearestHospital(): RecommendedHospital | null {
    return this.hospitals[0] ?? null;
  }

  hospitalDistance(hospital: RecommendedHospital | null): string {
    return hospital?.distanceKm || hospital?.distance_km || '';
  }

  hospitalMapsUrl(hospital: RecommendedHospital | null): string {
    if (!hospital) return '#';
    if (!this.lastLocation) {
      return `https://www.google.com/maps?q=${hospital.latitude},${hospital.longitude}`;
    }
    return `https://www.google.com/maps/dir/?api=1&origin=${this.lastLocation.latitude},${this.lastLocation.longitude}&destination=${hospital.latitude},${hospital.longitude}&travelmode=driving`;
  }

  private locationKey(loc: PatientLocation): string {
    return `${loc.latitude.toFixed(5)},${loc.longitude.toFixed(5)}`;
  }

  locationAddress(loc: PatientLocation | null): string {
    if (!loc) return 'Address unavailable';
    const directAddress = (loc as any).adresse || (loc as any).address || (loc as any).displayName;
    if (directAddress) return directAddress;
    return this.addressCache[this.locationKey(loc)] || 'Searching for address...';
  }

  private loadAddressForLocation(loc: PatientLocation): void {
    const key = this.locationKey(loc);
    const directAddress = (loc as any).adresse || (loc as any).address || (loc as any).displayName;
    if (directAddress) {
      this.addressCache[key] = directAddress;
      if (loc === this.lastLocation) this.lastLocationAddress = directAddress;
      return;
    }
    if (this.addressCache[key]) {
      if (loc === this.lastLocation) this.lastLocationAddress = this.addressCache[key];
      return;
    }

    this.addressCache[key] = 'Searching for address...';
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${loc.latitude}&lon=${loc.longitude}&zoom=18&addressdetails=1`)
      .then(response => response.ok ? response.json() : null)
      .then(result => {
        this.addressCache[key] = result?.display_name || 'Address unavailable';
        if (loc === this.lastLocation) this.lastLocationAddress = this.addressCache[key];
      })
      .catch(() => {
        this.addressCache[key] = 'Address unavailable';
        if (loc === this.lastLocation) this.lastLocationAddress = this.addressCache[key];
      });
  }

  // ═══════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════
  private incidentColor(type: string): string {
    const c: Record<string, string> = {
      'TROU': '#dc3545', 'OBSTACLE': '#fd7e14', 'ESCALIER': '#ffc107',
      'ACCIDENT': '#6f42c1', 'CHUTE_PERSONNE': '#e83e8c',
      'INCENDIE': '#fd7e14', 'INONDATION': '#0dcaf0',
    };
    return c[type] ?? '#6c757d';
  }

  private incidentEmoji(type: string): string {
    const e: Record<string, string> = {
      'TROU': '🕳️', 'OBSTACLE': '🚧', 'ESCALIER': '🪜',
      'ACCIDENT': '🚨', 'CHUTE_PERSONNE': '🆘',
      'INCENDIE': '🔥', 'INONDATION': '🌊',
    };
    return e[type] ?? '⚠️';
  }

  incidentEmojiPublic(type: string): string { return this.incidentEmoji(type); }
  incidentColorPublic(type: string): string  { return this.incidentColor(type); }

  getTypeColor(type: string | null): string {
    return this.incidentColor(type || '');
  }

  getTypeEmoji(type: string | null): string {
    return this.incidentEmoji(type || '');
  }

  private emptyIncident(): any {
    return {
      patientId: null,
      latitude: null,
      longitude: null,
      type: null,
      title: '',
      description: '',
      media: null,
      mediaPreview: null,
      aiAnalysis: null,
      aiConfidence: null
    };
  }

  private clipLabelToType(label: string): string {
    const normalized = (label || '').toLowerCase();
    if (normalized.includes('trou')) return 'TROU';
    if (normalized.includes('obstacle')) return 'OBSTACLE';
    if (normalized.includes('escalier')) return 'ESCALIER';
    if (normalized.includes('accident')) return 'ACCIDENT';
    if (normalized.includes('chute')) return 'CHUTE_PERSONNE';
    if (normalized.includes('incendie') || normalized.includes('feu')) return 'INCENDIE';
    if (normalized.includes('inondation') || normalized.includes('eau')) return 'INONDATION';
    if (normalized.includes('danger') || normalized.includes('zone')) return 'ZONE_DANGEREUSE';
    return 'AUTRE';
  }

  private typeToTitle(type: string): string {
    const titles: Record<string, string> = {
      TROU: 'Hole detected',
      OBSTACLE: 'Obstacle on the route',
      ESCALIER: 'Dangerous stairs',
      ACCIDENT: 'Accident reported',
      CHUTE_PERSONNE: 'Fall detected',
      INCENDIE: 'Fire reported',
      INONDATION: 'Flood reported',
      ZONE_DANGEREUSE: 'Danger zone',
      AUTRE: 'Incident reported'
    };
    return titles[type] || titles['AUTRE'];
  }

  private typeToDescription(type: string): string {
    const descriptions: Record<string, string> = {
      TROU: 'A hole may block the patient path.',
      OBSTACLE: 'An obstacle is present on the patient route.',
      ESCALIER: 'Stairs may present a fall risk.',
      ACCIDENT: 'An accident was reported in this area.',
      CHUTE_PERSONNE: 'A fall or fall risk was detected.',
      INCENDIE: 'A fire risk was reported.',
      INONDATION: 'A flooded area may block or endanger the patient.',
      ZONE_DANGEREUSE: 'This area may be dangerous for the patient.',
      AUTRE: 'An incident was reported in this area.'
    };
    return descriptions[type] || descriptions['AUTRE'];
  }

  formatDate(d?: string): string {
    return d ? new Date(d).toLocaleString('en') : '';
  }
}
