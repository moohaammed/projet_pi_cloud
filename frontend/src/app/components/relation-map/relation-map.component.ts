import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { MapService } from '../../services/map.service';
import { AlzUserService } from '../../services/alz-user.service';
import { AuthService } from '../../services/auth.service';
import { HospitalService } from '../../services/hospital.service';
import { IncidentService, Incident } from '../../services/incident.service';
import { SafeZone, GeoAlert, PatientLocation } from '../../models/map.model';
import { User } from '../../models/user.model';
import { Hospital } from '../../models/hospital.model';

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

  // ── Données ──────────────────────────────────────────────────────────────
  currentUser:     User | null     = null;
  patient:         User | null     = null;
  lastLocation:    PatientLocation | null = null;
  zone:            SafeZone | null = null;
  alerts:          GeoAlert[]      = [];
  incidents:       Incident[]      = [];
  hospitals:       Hospital[]      = [];
  history:         PatientLocation[] = [];

  // ── UI ───────────────────────────────────────────────────────────────────
  activeTab:      'info' | 'alerts' | 'incidents' | 'history' = 'info';
  showHistory     = false;
  historyLoading  = false;
  loadingLocation = true;
  isOnline        = false;

  private refreshInterval: any;
  private readonly CLIP_URL    = 'http://localhost:8000/predict';
  private readonly REFRESH_MS  = 15000;

  constructor(
    private mapService:      MapService,
    private alzUserService:  AlzUserService,
    private authService:     AuthService,
    private hospitalService: HospitalService,
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
      this.loadHospitals();
    }, 300);
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshInterval);
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
            error: () => console.error('Patient introuvable')
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
        this.updatePatientMarker(loc);
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
            <div style="color:#28a745;font-weight:700">● En ligne</div>
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
                 <span style="color:#6c757d">● Hors ligne</span>`)
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
    }).bindTooltip(`✅ Zone verte — ${zone.rayonVert}m`).addTo(this.map);

    this.redCircle = L.circle([zone.latitudeCentre, zone.longitudeCentre], {
      radius: zone.rayonRouge, color: '#dc3545',
      fillColor: '#dc3545', fillOpacity: 0.05, weight: 2, dashArray: '5 5'
    }).bindTooltip(`🔴 Zone rouge — ${zone.rayonRouge}m`).addTo(this.map);

    this.houseMarker = L.marker([zone.latitudeCentre, zone.longitudeCentre], {
      icon: this.getHouseIcon()
    }).bindPopup(`
      <div style="text-align:center">
        <b>🏠 Domicile de ${this.patient?.prenom}</b><br>
        <small style="color:#28a745">Zone verte : ${zone.rayonVert}m</small><br>
        <small style="color:#dc3545">Zone rouge : ${zone.rayonRouge}m</small>
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

  // ═══════════════════════════════════════
  // HISTORIQUE OSRM
  // ═══════════════════════════════════════
  toggleHistory(): void {
    this.showHistory = !this.showHistory;
    if (!this.patient?.id) return;
    if (this.showHistory) {
      this.mapService.getHistory(this.patient.id).subscribe({
        next: (data) => { this.history = data; this.drawRouteHistory(data); }
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
          }).bindTooltip('Départ').addTo(this.map);

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
          }).bindTooltip('Arrivée').addTo(this.map);

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
  private loadHospitals(): void {
    this.hospitalService.getAll().subscribe({
      next: (data) => { this.hospitals = data; this.drawHospitalMarkers(data); }
    });
  }

  private drawHospitalMarkers(hospitals: Hospital[]): void {
    hospitals.forEach(h => {
      if (!h.latitude || !h.longitude) return;
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#dc3545;color:white;border-radius:6px;
                           width:28px;height:28px;display:flex;align-items:center;
                           justify-content:center;font-size:13px;
                           border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.25)">🏥</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14]
      });
      const m = L.marker([h.latitude, h.longitude], { icon })
        .bindPopup(`<b>🏥 ${h.nom}</b><br><small>${h.adresse}, ${h.ville}</small>
          ${h.telephone ? `<br><small>📞 ${h.telephone}</small>` : ''}
          <br><a href="https://maps.google.com/?q=${h.latitude},${h.longitude}"
                 target="_blank"
                 style="display:block;margin-top:6px;padding:3px 8px;background:#dc3545;
                        color:white;border-radius:4px;text-decoration:none;text-align:center;font-size:11px">
            Itinéraire
          </a>`)
        .addTo(this.map);
      this.hospitalMarkers.push(m);
    });
  }

  get nearestHospital(): Hospital | null {
    if (!this.lastLocation) return null;
    let nearest: Hospital | null = null;
    let minDist = Infinity;
    this.hospitals.forEach(h => {
      if (!h.latitude || !h.longitude) return;
      const d = this.haversine(
        this.lastLocation!.latitude, this.lastLocation!.longitude,
        h.latitude, h.longitude
      );
      if (d < minDist) { minDist = d; nearest = h; }
    });
    return nearest;
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

  formatDate(d?: string): string {
    return d ? new Date(d).toLocaleString('fr') : '';
  }
}