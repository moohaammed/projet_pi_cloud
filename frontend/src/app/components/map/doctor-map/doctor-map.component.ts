import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { MapService } from '../../../services/map.service';
import { AlzUserService } from '../../../services/alz-user.service';
import { AuthService } from '../../../services/auth.service';
import { HospitalService } from '../../../services/hospital.service';
import { HospitalPrediction, HospitalPredictionService, RecommendedHospital } from '../../../services/hospital-prediction.service';
import { IncidentService, Incident } from '../../../services/incident.service';
import { SafeZone, GeoAlert, PatientLocation } from '../../../models/map.model';
import { User, Role } from '../../../models/user.model';
import { Hospital } from '../../../models/hospital.model';

@Component({
  selector: 'app-doctor-map',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './doctor-map.component.html',
  styles: [`
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    @keyframes slideInUp {
      from { transform: translateY(40px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
  `]
})
export class DoctorMapComponent implements OnInit, AfterViewInit, OnDestroy {

  // ── Couches carte ────────────────────────────────────────────────────────
  private map!: L.Map;
  private patientMarkers:       Map<number, L.Marker>     = new Map();
  private greenCircles:         Map<number, L.Circle>     = new Map();
  private redCircles:           Map<number, L.Circle>     = new Map();
  private historyLayers:        Map<number, L.Polyline[]> = new Map();
  private hospitalMarkers:      L.Marker[] = [];
  private recommendedHospitalMarkers: L.Marker[] = [];
  private hospitalRouteLine: L.Polyline | null = null;
  private hospitalRouteEndpointMarkers: L.Marker[] = [];
  private hospitalPredictionKeys: Map<number, string> = new Map();
  private centerMarker:         L.Marker | null = null;
  private houseMarkers:         Map<number, L.Marker> = new Map();
  private incidentMarkers:      L.Marker[] = [];
  private addIncidentDraftMarker: L.Marker | null = null;

  // ── Données ──────────────────────────────────────────────────────────────
  patients:        User[]      = [];
  hospitals:       Hospital[]  = [];
  hospitalPredictions: HospitalPrediction[] = [];
  incidents:       Incident[]  = [];
  patientIncidents: Incident[] = [];
  selectedPatient: User | null = null;
  selectedZone:    SafeZone | null = null;
  alerts:          GeoAlert[]  = [];
  history:         PatientLocation[] = [];

  // ── UI état ──────────────────────────────────────────────────────────────
  loading          = false;
  editingZone      = false;
  showHospitals    = true;
  showRecommendedHospitals = true;
  showHistory      = false;
  showIncidents    = true;
  loadingIncidents = false;
  activeTab: 'zone' | 'history' | 'alerts' | 'incidents' = 'zone';
  incidentFilter: 'ALL' | 'EN_COURS' | 'RESOLU' | 'FERME' = 'ALL';

  // ── Création d'incident ──────────────────────────────────────────────────
  addingIncident    = false;
  showIncidentPanel = false;
  savingIncident    = false;
  panelAnalyzing    = false;
  panelClipError: string | null = null;
  incidentCreateError: string | null = null;

  newIncident = this.emptyIncident();

  // ── Analyseur IA ─────────────────────────────────────────────────────────
  showAiAnalyzer      = false;
  analyzerLoading     = false;
  analyzerError: string | null = null;
  analyzerImagePreview: string | null = null;
  analyzerImageBase64: string | null = null;
  analyzerResult: {
    message: string;
    danger: boolean;
    label: string;
    confidence: number;
    predictions: { label: string; score: number }[];
  } | null = null;
  analyzerPatientId: number | null = null;

  // URL de votre serveur Python FastAPI CLIP
  private readonly CLIP_URL = 'http://localhost:8000/predict';

  // ── Types d'incident ──────────────────────────────────────────────────────
  readonly incidentTypes = [
    { value: 'TROU',            label: 'Trou',        emoji: '🕳️', color: '#dc3545' },
    { value: 'OBSTACLE',        label: 'Obstacle',    emoji: '🚧', color: '#fd7e14' },
    { value: 'ESCALIER',        label: 'Escalier',    emoji: '🪜', color: '#ffc107' },
    { value: 'ACCIDENT',        label: 'Accident',    emoji: '🚨', color: '#6f42c1' },
    { value: 'CHUTE_PERSONNE',  label: 'Chute',       emoji: '🆘', color: '#e83e8c' },
    { value: 'INCENDIE',        label: 'Incendie',    emoji: '🔥', color: '#fd7e14' },
    { value: 'INONDATION',      label: 'Inondation',  emoji: '🌊', color: '#0dcaf0' },
    { value: 'ZONE_DANGEREUSE', label: 'Zone danger', emoji: '☢️', color: '#6f42c1' },
    { value: 'AUTRE',           label: 'Autre',       emoji: '⚠️', color: '#6c757d' },
  ];

  newZone: SafeZone = {
    patientId: 0, doctorId: 0,
    latitudeCentre: 36.8065, longitudeCentre: 10.1815,
    rayonVert: 200, rayonRouge: 500, actif: true
  };

  private refreshInterval: any;

  constructor(
    private mapService:      MapService,
    private alzUserService:  AlzUserService,
    private authService:     AuthService,
    private hospitalService: HospitalService,
    private hospitalPredictionService: HospitalPredictionService,
    private incidentService: IncidentService
  ) {}

  ngOnInit(): void {
    // 60s au lieu de 15s — évite le spam de 404 dans la console
    this.refreshInterval = setInterval(() => this.refreshAllPositions(), 60000);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
      this.loadPatients();
      this.loadHospitalPredictions();
      this.loadAlerts();
      this.loadIncidents();
    }, 300);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.map) this.map.remove();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CARTE
  // ═══════════════════════════════════════════════════════════════════════════

  private initMap(): void {
    this.map = L.map('doctor-map', { center: [36.8065, 10.1815], zoom: 13 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.editingZone && !this.addingIncident) {
        this.newZone.latitudeCentre  = e.latlng.lat;
        this.newZone.longitudeCentre = e.latlng.lng;
        this.updatePreviewZone();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INCIDENTS GLOBAUX (marqueurs carte)
  // ═══════════════════════════════════════════════════════════════════════════

  loadIncidents(): void {
    this.incidentService.getAll().subscribe({
      next: (data) => { this.incidents = data; this.addIncidentMarkers(data); },
      error: (err) => {
        // 405 = endpoint GET non configuré côté backend → fail silencieux
        // 503 = gateway down → fail silencieux
        if (err.status !== 404) {
          console.warn(`[incidents] ${err.status} — vérifiez le @GetMapping dans IncidentController`);
        }
        this.incidents = [];
      }
    });
  }

  private addIncidentMarkers(incidents: Incident[]): void {
    this.incidentMarkers.forEach(m => m.remove());
    this.incidentMarkers = [];

    incidents.forEach(inc => {
      if (!inc.latitude || !inc.longitude) return;

      const { color, emoji } = this.typeStyle(inc.type);

      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${color};color:white;border-radius:50%;width:38px;height:38px;
                           display:flex;align-items:center;justify-content:center;
                           border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);font-size:18px">
                 ${emoji}
               </div>`,
        iconSize: [38, 38], iconAnchor: [19, 19]
      });

      const conf = ((inc.aiConfidence ?? 0) * 100).toFixed(1);
      const date = inc.createdAt ? new Date(inc.createdAt).toLocaleString('fr') : '';

      const marker = L.marker([inc.latitude, inc.longitude], { icon })
        .bindPopup(`
          <div style="min-width:200px">
            <div style="background:${color};color:white;padding:8px 12px;
                        margin:-8px -12px 8px;border-radius:4px 4px 0 0">
              <strong>${emoji} ${inc.title}</strong>
            </div>
            <div style="font-size:12px;padding:4px 0">
              <div><b>Type :</b> ${inc.type}</div>
              <div><b>Statut :</b>
                <span style="color:${inc.status==='EN_COURS'?'#dc3545':'#28a745'}">${inc.status}</span>
              </div>
              <div><b>IA :</b> ${inc.aiAnalysis??'-'} (${conf}%)</div>
              <div style="color:#888;font-size:11px;margin-top:4px">${date}</div>
            </div>
            <a href="https://www.google.com/maps?q=${inc.latitude},${inc.longitude}"
               target="_blank"
               style="display:block;margin-top:6px;padding:3px 8px;background:#0d6efd;
                      color:white;border-radius:4px;text-decoration:none;text-align:center;font-size:11px">
              📍 Voir sur Google Maps
            </a>
          </div>`)
        .addTo(this.map);

      this.incidentMarkers.push(marker);
    });
  }

  toggleIncidents(): void {
    this.showIncidents = !this.showIncidents;
    this.incidentMarkers.forEach(m => this.showIncidents ? m.addTo(this.map) : m.remove());
  }

  get incidentCount(): number {
    return this.incidents.filter(i => i.status === 'EN_COURS').length;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INCIDENTS PATIENT (onglet)
  // ═══════════════════════════════════════════════════════════════════════════

  loadPatientIncidents(): void {
    if (!this.selectedPatient?.id) return;
    this.loadingIncidents = true;
    this.patientIncidents = [];
    this.incidentService.getByPatient(this.selectedPatient.id).subscribe({
      next: (data) => { this.patientIncidents = data; this.loadingIncidents = false; },
      error: (err) => { console.error(err); this.loadingIncidents = false; }
    });
  }

  // true = sidebar gauche "Voir tous" → affiche this.incidents (tous les 15)
  // false = onglet patient → affiche this.patientIncidents (patient sélectionné)
  viewingAllIncidents = false;

  get filteredPatientIncidents(): Incident[] {
    const source = this.viewingAllIncidents ? this.incidents : this.patientIncidents;
    if (this.incidentFilter === 'ALL') return source;
    return source.filter(i => i.status === this.incidentFilter);
  }

  countByStatus(status: string): number {
    const source = this.viewingAllIncidents ? this.incidents : this.patientIncidents;
    return source.filter(i => i.status === status).length;
  }

  get incidentTabCount(): number {
    return this.viewingAllIncidents ? this.incidents.length : this.patientIncidents.length;
  }

  openIncidentsTab(): void {
    this.viewingAllIncidents = false;
    this.activeTab = 'incidents';
    this.loadPatientIncidents();
  }

  /** "Voir tous (N)" sidebar gauche → affiche les 15 sans filtrer par patient */
  goToIncidentsTab(): void {
    this.viewingAllIncidents = true;
    this.activeTab = 'incidents';
    this.incidentFilter = 'ALL';
    // this.incidents est déjà chargé par loadIncidents() au démarrage
  }

  focusIncidentOnMap(inc: Incident): void {
    if (!inc.latitude || !inc.longitude) return;
    this.map.setView([inc.latitude, inc.longitude], 17);
    const marker = this.incidentMarkers.find(
      m => Math.abs(m.getLatLng().lat - inc.latitude!) < 0.0001 &&
           Math.abs(m.getLatLng().lng - inc.longitude!) < 0.0001
    );
    if (marker) marker.openPopup();
  }

  viewIncidentMedia(inc: Incident): void {
    if (!inc.media) return;
    const win = window.open();
    if (win) win.document.write(
      `<html><body style="margin:0;background:#111;display:flex;align-items:center;
       justify-content:center;min-height:100vh">
       <img src="${inc.media}" style="max-width:100%;max-height:100vh">
       </body></html>`
    );
  }

  resolveIncident(id: string): void {
    this.incidentService.resoudre(id).subscribe({
      next: (u) => { this.updateIncidentInLists(u); }
    });
  }

  closeIncident(id: string): void {
    this.incidentService.fermer(id).subscribe({
      next: (u) => this.updateIncidentInLists(u)
    });
  }

  /** Change le statut vers n'importe lequel des 3 états. */
  changeIncidentStatus(inc: Incident, targetStatus: 'EN_COURS' | 'RESOLU' | 'FERME'): void {
    if (inc.status === targetStatus || !inc.id) return;

    const call$ = targetStatus === 'RESOLU'
      ? this.incidentService.resoudre(inc.id)
      : targetStatus === 'FERME'
        ? this.incidentService.fermer(inc.id)
        : this.incidentService.reouvrir(inc.id);

    call$.subscribe({
      next:  (updated) => this.updateIncidentInLists(updated),
      error: (err)     => console.error('Erreur changement statut:', err)
    });
  }

  private updateIncidentInLists(updated: Incident): void {
    const pi = this.patientIncidents.findIndex(i => i.id === updated.id);
    if (pi !== -1) this.patientIncidents[pi] = updated;
    const gi = this.incidents.findIndex(i => i.id === updated.id);
    if (gi !== -1) this.incidents[gi] = updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYSEUR IA (modale CLIP)
  // ═══════════════════════════════════════════════════════════════════════════

  openAiAnalyzer(): void {
    this.showAiAnalyzer      = true;
    this.analyzerResult      = null;
    this.analyzerError       = null;
    this.analyzerImagePreview = null;
    this.analyzerImageBase64  = null;
    this.analyzerPatientId   = this.selectedPatient?.id ?? null;
  }

  closeAiAnalyzer(): void {
    this.showAiAnalyzer = false;
  }

  onAnalyzerImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.analyzerImagePreview = result;
      this.analyzerImageBase64  = result;
      this.runClipAnalysis(result);
    };
    reader.readAsDataURL(file);
  }

  private runClipAnalysis(base64: string): void {
    this.analyzerLoading = true;
    this.analyzerError   = null;
    this.analyzerResult  = null;

    fetch(this.CLIP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: base64 })
    })
    .then(r => r.json())
    .then((data: any) => {
      this.analyzerLoading = false;
      if (data.error) {
        this.analyzerError = data.error;
        return;
      }
      this.analyzerResult = {
        message:     data.message,
        danger:      data.danger,
        label:       data.label,
        confidence:  data.confidence,
        predictions: data.predictions ?? []
      };
    })
    .catch(err => {
      this.analyzerLoading = false;
      this.analyzerError = 'Impossible de contacter le serveur CLIP. Vérifiez qu\'il est démarré.';
      console.error(err);
    });
  }

  /**
   * Lance la création d'un incident pré-rempli depuis le résultat CLIP.
   * Ferme la modale et ouvre le panneau de création.
   */
  createIncidentFromAnalysis(): void {
    const result = this.analyzerResult;
    this.closeAiAnalyzer();

    this.newIncident = {
      patientId:    this.analyzerPatientId ?? this.selectedPatient?.id ?? null,
      type:         result ? this.clipLabelToType(result.label) : null,
      title:        result ? this.typeToTitle(this.clipLabelToType(result.label)) : '',
      description:  result ? this.typeToDescription(this.clipLabelToType(result.label)) : '',
      latitude:     null,
      longitude:    null,
      aiAnalysis:   result?.label ?? null,
      aiConfidence: result?.confidence ?? null,
      media:        this.analyzerImageBase64,
      mediaPreview: this.analyzerImagePreview,
    };

    this.addingIncident      = true;
    this.showIncidentPanel   = true;
    this.incidentCreateError = null;

    this.map.getContainer().style.cursor = 'crosshair';
    this.map.once('click', (e: L.LeafletMouseEvent) => {
      this.placeIncidentDraftMarker(e.latlng.lat, e.latlng.lng);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRÉATION INCIDENT MANUELLE
  // ═══════════════════════════════════════════════════════════════════════════

  startAddIncident(): void {
    this.newIncident = {
      ...this.emptyIncident(),
      patientId: this.selectedPatient?.id ?? null,
    };

    this.addingIncident      = true;
    this.showIncidentPanel   = true;
    this.incidentCreateError = null;

    this.map.getContainer().style.cursor = 'crosshair';
    this.map.once('click', (e: L.LeafletMouseEvent) => {
      this.placeIncidentDraftMarker(e.latlng.lat, e.latlng.lng);
    });
  }

  repositionIncidentMarker(): void {
    this.addingIncident = true;
    this.map.getContainer().style.cursor = 'crosshair';
    this.addIncidentDraftMarker?.remove();
    this.addIncidentDraftMarker = null;
    this.map.once('click', (e: L.LeafletMouseEvent) => {
      this.placeIncidentDraftMarker(e.latlng.lat, e.latlng.lng);
    });
  }

  private placeIncidentDraftMarker(lat: number, lng: number): void {
    this.newIncident.latitude  = lat;
    this.newIncident.longitude = lng;
    this.addingIncident = false;
    this.map.getContainer().style.cursor = '';

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:40px;height:40px;
                         background:linear-gradient(135deg,#6f42c1,#3c3489);
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
      this.newIncident.latitude  = ll.lat;
      this.newIncident.longitude = ll.lng;
    });

    this.map.panTo([lat, lng]);
  }

  cancelAddIncident(): void {
    this.addingIncident      = false;
    this.showIncidentPanel   = false;
    this.incidentCreateError = null;
    this.panelAnalyzing      = false;
    this.panelClipError      = null;
    this.map.getContainer().style.cursor = '';
    this.addIncidentDraftMarker?.remove();
    this.addIncidentDraftMarker = null;
    this.map.off('click');
  }

  onTypeSelected(t: { value: string; label: string; emoji: string; color: string }): void {
    this.newIncident.type = t.value;
    // Auto-remplir titre/description seulement si vides
    if (!this.newIncident.title)
      this.newIncident.title = this.typeToTitle(t.value);
    if (!this.newIncident.description)
      this.newIncident.description = this.typeToDescription(t.value);
  }

  onIncidentPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      this.newIncident.media        = base64;
      this.newIncident.mediaPreview = base64;
      // ← Lance CLIP automatiquement
      this.runPanelClipAnalysis(base64);
    };
    reader.readAsDataURL(file);
  }

  /** Appelle CLIP depuis le panneau incident et pré-remplit type/titre/description. */
  private runPanelClipAnalysis(base64: string): void {
    this.panelAnalyzing  = true;
    this.panelClipError  = null;
    // Reset les champs détectés
    this.newIncident.type         = null;
    this.newIncident.title        = '';
    this.newIncident.description  = '';
    this.newIncident.aiAnalysis   = null;
    this.newIncident.aiConfidence = null;

    fetch(this.CLIP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: base64 })
    })
    .then(r => r.json())
    .then((data: any) => {
      this.panelAnalyzing = false;
      if (data.error) { this.panelClipError = data.error; return; }

      const label      = data.label as string;
      const confidence = data.confidence as number;
      const type       = this.clipLabelToType(label);

      this.newIncident.aiAnalysis   = label;
      this.newIncident.aiConfidence = confidence;
      this.newIncident.type         = type;
      this.newIncident.title        = this.typeToTitle(type);
      this.newIncident.description  = this.typeToDescription(type);
    })
    .catch(() => {
      this.panelAnalyzing = false;
      this.panelClipError = 'Serveur CLIP indisponible. Choisissez le type manuellement.';
    });
  }

  /** Couleur du badge type pour l'affichage lecture seule. */
  getTypeColor(type: string | null): string {
    return this.typeStyle(type ?? '').color;
  }

  /** Emoji du type pour l'affichage lecture seule. */
  getTypeEmoji(type: string | null): string {
    return this.typeStyle(type ?? '').emoji;
  }

  saveNewIncident(): void {
    if (!this.newIncident.latitude || !this.newIncident.type) {
      this.incidentCreateError = 'Veuillez placer le marqueur sur la carte et importer une photo pour détecter le type.';
      return;
    }
    this.savingIncident = true;
    this.incidentCreateError = null;

    const doctorId = this.authService.getCurrentUser().id ?? 1;

    const payload: any = {
      reporterId:   doctorId,
      aiAnalysis:   this.newIncident.aiAnalysis ?? this.newIncident.type,
      aiConfidence: this.newIncident.aiConfidence ?? 1.0,
      latitude:     this.newIncident.latitude,
      longitude:    this.newIncident.longitude,
    };

    // patientId optionnel — on prend le patient sélectionné si disponible
    if (this.selectedPatient?.id) {
      payload.patientId = this.selectedPatient.id;
    }
    if (this.newIncident.media) {
      payload.media = this.newIncident.media;
    }

    this.incidentService.create(payload).subscribe({
      next: () => {
        this.savingIncident = false;
        this.cancelAddIncident();
        this.loadIncidents();
        if (this.selectedPatient?.id) this.loadPatientIncidents();
      },
      error: (err) => {
        this.savingIncident = false;
        this.incidentCreateError = 'Erreur lors de la création. Vérifiez la connexion.';
        console.error(err);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PREVIEW ZONE
  // ═══════════════════════════════════════════════════════════════════════════

  private previewGreen: L.Circle | null = null;
  private previewRed:   L.Circle | null = null;

  updatePreviewZone(): void {
    this.previewGreen?.remove();
    this.previewRed?.remove();

    this.previewGreen = L.circle(
      [this.newZone.latitudeCentre, this.newZone.longitudeCentre],
      { radius: this.newZone.rayonVert, color: '#28a745', fillColor: '#28a745', fillOpacity: 0.15, weight: 2, dashArray: '5 5' }
    ).addTo(this.map);

    this.previewRed = L.circle(
      [this.newZone.latitudeCentre, this.newZone.longitudeCentre],
      { radius: this.newZone.rayonRouge, color: '#dc3545', fillColor: '#dc3545', fillOpacity: 0.07, weight: 2, dashArray: '5 5' }
    ).addTo(this.map);

    const houseIcon = this.getHouseIcon();
    if (this.centerMarker) {
      this.centerMarker.setLatLng([this.newZone.latitudeCentre, this.newZone.longitudeCentre]);
      this.centerMarker.setIcon(houseIcon);
    } else {
      this.centerMarker = L.marker(
        [this.newZone.latitudeCentre, this.newZone.longitudeCentre],
        { icon: houseIcon, draggable: true }
      ).addTo(this.map);

      this.centerMarker.on('dragend', (e: any) => {
        const ll = e.target.getLatLng();
        this.newZone.latitudeCentre  = ll.lat;
        this.newZone.longitudeCentre = ll.lng;
        this.updatePreviewZone();
      });
    }
    this.map.setView([this.newZone.latitudeCentre, this.newZone.longitudeCentre], 15);
  }

  private getHouseIcon(): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<div style="position:relative;width:50px;height:50px;filter:drop-shadow(2px 4px 6px rgba(0,0,0,0.4))">
               <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:26px solid transparent;border-right:26px solid transparent;border-bottom:20px solid #c0392b"></div>
               <div style="position:absolute;top:8px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:22px solid transparent;border-right:22px solid transparent;border-bottom:16px solid #e74c3c"></div>
               <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:36px;height:26px;background:linear-gradient(135deg,#f5f0e8,#e8dcc8);border:1px solid #c8b99a;border-radius:0 0 2px 2px">
                 <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:10px;height:14px;background:linear-gradient(135deg,#8B4513,#6B3410);border-radius:3px 3px 0 0"></div>
                 <div style="position:absolute;top:4px;left:3px;width:8px;height:7px;background:linear-gradient(135deg,#85c1e9,#5dade2);border:1px solid #aaa;border-radius:1px"></div>
                 <div style="position:absolute;top:4px;right:3px;width:8px;height:7px;background:linear-gradient(135deg,#85c1e9,#5dade2);border:1px solid #aaa;border-radius:1px"></div>
               </div>
             </div>`,
      iconSize: [50, 50], iconAnchor: [25, 50]
    });
  }

  clearPreview(): void {
    this.previewGreen?.remove();
    this.previewRed?.remove();
    this.centerMarker?.remove();
    this.previewGreen = null;
    this.previewRed   = null;
    this.centerMarker = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATIENTS
  // ═══════════════════════════════════════════════════════════════════════════

  loadPatients(): void {
    this.alzUserService.getByRole(Role.PATIENT).subscribe({
      next: (data) => { this.patients = data; data.forEach(p => this.loadPatientPosition(p)); }
    });
  }

  loadPatientPosition(patient: User): void {
    if (!patient.id) return;
    this.mapService.getLastLocation(patient.id).subscribe({
      next: (loc) => this.addPatientMarker(patient, loc),
      // 404 = patient sans position GPS → marqueur "hors ligne" silencieux
      error: () => this.addOfflineMarker(patient)
    });
  }

  private addPatientMarker(patient: User, loc: PatientLocation): void {
    const batterie = loc.batterie ?? 100;
    const bColor = batterie < 20 ? '#dc3545' : batterie < 50 ? '#ffc107' : '#28a745';

    const icon = L.divIcon({
      className: '',
      html: `<div style="position:relative">
               <div style="background:#0d6efd;color:white;border-radius:50%;width:42px;height:42px;
                           display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;
                           border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
                 ${patient.nom?.charAt(0)}${patient.prenom?.charAt(0)}
               </div>
               <div style="position:absolute;bottom:-2px;right:-2px;background:${bColor};
                           border-radius:50%;width:14px;height:14px;border:2px solid white;font-size:8px;
                           display:flex;align-items:center;justify-content:center;color:white;font-weight:bold">
                 ${batterie < 20 ? '!' : ''}
               </div>
             </div>`,
      iconSize: [42, 42], iconAnchor: [21, 21]
    });

    this.patientMarkers.get(patient.id!)?.remove();
    const marker = L.marker([loc.latitude, loc.longitude], { icon })
      .bindPopup(`<div style="min-width:180px">
        <div style="background:#0d6efd;color:white;padding:8px 12px;margin:-8px -12px 8px;border-radius:4px 4px 0 0">
          <strong>${patient.nom} ${patient.prenom}</strong>
        </div>
        <div style="padding:4px 0;font-size:13px">
          <div style="color:#28a745;font-weight:bold">● En ligne</div>
          <div>🔋 <span style="color:${bColor};font-weight:bold">${batterie}%</span></div>
          <div style="color:#888;font-size:11px">${loc.timestamp ? new Date(loc.timestamp).toLocaleString('fr') : ''}</div>
        </div>
      </div>`);
    marker.addTo(this.map);
    this.patientMarkers.set(patient.id!, marker);
    this.loadPatientZones(patient.id!, loc);
    this.predictHospitalForPatient(patient, loc);
  }

  private addOfflineMarker(patient: User): void {
    if (!patient.id) return;
    const icon = L.divIcon({
      className: '',
      html: `<div style="background:#6c757d;color:white;border-radius:50%;width:42px;height:42px;
                         display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;
                         border:3px solid white;opacity:0.6">
               ${patient.nom?.charAt(0)}${patient.prenom?.charAt(0)}
             </div>`,
      iconSize: [42, 42], iconAnchor: [21, 21]
    });
    this.patientMarkers.get(patient.id!)?.remove();
    const marker = L.marker([36.8065, 10.1815], { icon })
      .bindPopup(`<strong>${patient.nom} ${patient.prenom}</strong><br><span style="color:#6c757d">● Hors ligne</span>`);
    marker.addTo(this.map);
    this.patientMarkers.set(patient.id!, marker);
  }

  private loadPatientZones(patientId: number, loc: PatientLocation): void {
    this.mapService.getZoneByPatient(patientId).subscribe({
      next: (zones) => {
        this.greenCircles.get(patientId)?.remove();
        this.redCircles.get(patientId)?.remove();
        this.houseMarkers.get(patientId)?.remove();

        zones.forEach(zone => {
          if (!zone.actif) return;
          const green = L.circle([zone.latitudeCentre, zone.longitudeCentre],
            { radius: zone.rayonVert, color: '#28a745', fillColor: '#28a745', fillOpacity: 0.1, weight: 2, dashArray: '5 5' }
          ).bindTooltip(`Zone verte — ${zone.rayonVert}m`).addTo(this.map);

          const red = L.circle([zone.latitudeCentre, zone.longitudeCentre],
            { radius: zone.rayonRouge, color: '#dc3545', fillColor: '#dc3545', fillOpacity: 0.05, weight: 2, dashArray: '5 5' }
          ).bindTooltip(`Zone rouge — ${zone.rayonRouge}m`).addTo(this.map);

          const house = L.marker([zone.latitudeCentre, zone.longitudeCentre], { icon: this.getHouseIcon() })
            .bindPopup(`<div style="text-align:center">
              <b>🏠 Maison de ${this.selectedPatient?.prenom}</b><br>
              <small>Zone verte : ${zone.rayonVert}m — Zone rouge : ${zone.rayonRouge}m</small>
            </div>`).addTo(this.map);

          this.greenCircles.set(patientId, green);
          this.redCircles.set(patientId, red);
          this.houseMarkers.set(patientId, house);
        });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORIQUE
  // ═══════════════════════════════════════════════════════════════════════════

  loadHistory(patientId: number): void {
    this.mapService.getHistory(patientId).subscribe({
      next: (data) => { this.history = data; this.drawHistory(patientId, data); }
    });
  }

  historyLoading = false;   // spinner pendant l'appel OSRM

  private drawHistory(patientId: number, locations: PatientLocation[]): void {
    // Nettoyage des couches précédentes
    const old = this.historyLayers.get(patientId) || [];
    old.forEach(l => l.remove());
    this.historyLayers.set(patientId, []);
    if (locations.length < 2) return;

    // Filtrer les 7 derniers jours
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = locations.filter(
      l => l.timestamp && new Date(l.timestamp) >= sevenDaysAgo
    );
    if (recent.length < 2) return;

    // Échantillonnage : OSRM accepte max ~100 waypoints, on prend max 50
    const MAX_WAYPOINTS = 50;
    const step   = Math.max(1, Math.floor(recent.length / MAX_WAYPOINTS));
    const sampled: PatientLocation[] = recent.filter((_, i) => i % step === 0);
    // Toujours inclure le dernier point (position la plus récente)
    if (sampled[sampled.length - 1] !== recent[recent.length - 1]) {
      sampled.push(recent[recent.length - 1]);
    }

    // Coordonnées OSRM : "lng,lat;lng,lat;..."
    const coords = sampled.map(l => `${l.longitude},${l.latitude}`).join(';');
    const osrmUrl =
      `https://router.project-osrm.org/route/v1/driving/${coords}` +
      `?overview=full&geometries=geojson&steps=false`;

    this.historyLoading = true;

    fetch(osrmUrl)
      .then(r => r.json())
      .then((data: any) => {
        this.historyLoading = false;

        if (data.code === 'Ok' && data.routes?.length > 0) {
          // OSRM renvoie [lng, lat] → inverser en L.latLng(lat, lng)
          const routePoints: L.LatLng[] = data.routes[0].geometry.coordinates
            .map(([lng, lat]: [number, number]) => L.latLng(lat, lng));

          const routeLine = L.polyline(routePoints, {
            color: '#6f42c1', weight: 5, opacity: 0.85
          }).addTo(this.map);

          // Marqueur de départ (point le plus ancien)
          const startIcon = L.divIcon({
            className: '',
            html: `<div style="
              background:#6f42c1; color:white; border-radius:50%;
              width:20px; height:20px; border:3px solid white;
              box-shadow:0 2px 6px rgba(111,66,193,.5);
              display:flex; align-items:center; justify-content:center;
              font-size:10px; font-weight:700">D</div>`,
            iconSize: [20, 20], iconAnchor: [10, 10]
          });
          const startDate = sampled[0].timestamp
            ? new Date(sampled[0].timestamp!).toLocaleString('fr') : '';
          const startMarker = L.marker(
            L.latLng(sampled[0].latitude, sampled[0].longitude),
            { icon: startIcon }
          ).bindTooltip(`Départ · ${startDate}`).addTo(this.map);

          // Marqueur d'arrivée (position la plus récente)
          const endIcon = L.divIcon({
            className: '',
            html: `<div style="
              background:#28a745; color:white; border-radius:50%;
              width:20px; height:20px; border:3px solid white;
              box-shadow:0 2px 6px rgba(40,167,69,.5);
              display:flex; align-items:center; justify-content:center;
              font-size:10px; font-weight:700">A</div>`,
            iconSize: [20, 20], iconAnchor: [10, 10]
          });
          const endDate = sampled[sampled.length - 1].timestamp
            ? new Date(sampled[sampled.length - 1].timestamp!).toLocaleString('fr') : '';
          const endMarker = L.marker(
            L.latLng(sampled[sampled.length - 1].latitude, sampled[sampled.length - 1].longitude),
            { icon: endIcon }
          ).bindTooltip(`Arrivée · ${endDate}`).addTo(this.map);

          this.historyLayers.set(patientId, [routeLine, startMarker as any, endMarker as any]);
          this.map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

        } else {
          // OSRM n'a pas trouvé de route → fallback lignes droites
          this.drawStraightHistory(patientId, recent);
        }
      })
      .catch(() => {
        this.historyLoading = false;
        // Pas de connexion OSRM → fallback lignes droites
        this.drawStraightHistory(patientId, recent);
      });
  }

  /** Fallback : lignes droites si OSRM indisponible */
  private drawStraightHistory(patientId: number, recent: PatientLocation[]): void {
    const points = recent.map(l => L.latLng(l.latitude, l.longitude));
    const line = L.polyline(points, {
      color: '#6f42c1', weight: 3, opacity: 0.7, dashArray: '6 4'
    }).addTo(this.map);

    const startIcon = L.divIcon({
      className: '',
      html: `<div style="background:#6f42c1;border-radius:50%;width:14px;height:14px;border:2px solid white"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7]
    });
    const start = L.marker(points[points.length - 1], { icon: startIcon })
      .bindTooltip('Il y a 7 jours').addTo(this.map);

    this.historyLayers.set(patientId, [line, start as any]);
    this.map.fitBounds(line.getBounds(), { padding: [40, 40] });
  }

  clearHistory(patientId: number): void {
    const layers = this.historyLayers.get(patientId) || [];
    layers.forEach(l => l.remove());
    this.historyLayers.set(patientId, []);
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
    if (!this.selectedPatient?.id) return;
    if (this.showHistory) this.loadHistory(this.selectedPatient.id);
    else { this.clearHistory(this.selectedPatient.id); this.historyLoading = false; }
  }

  utiliserPositionActuelle(): void {
    if (!this.selectedPatient?.id) return;
    this.mapService.getLastLocation(this.selectedPatient.id).subscribe({
      next: (loc) => {
        this.newZone.latitudeCentre  = loc.latitude;
        this.newZone.longitudeCentre = loc.longitude;
        this.updatePreviewZone();
      }
    });
  }

  centrerSurMaison(): void {
    if (!this.selectedZone) return;
    this.map.setView([this.selectedZone.latitudeCentre, this.selectedZone.longitudeCentre], 16);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SÉLECTION PATIENT
  // ═══════════════════════════════════════════════════════════════════════════

  selectPatient(patient: User): void {
    this.selectedPatient     = patient;
    this.editingZone         = false;
    this.showHistory         = false;
    this.activeTab           = 'zone';
    this.patientIncidents    = [];
    this.incidentFilter      = 'ALL';
    this.viewingAllIncidents = false;   // ← reset : on passe en mode patient
    this.clearPreview();

    if (patient.id) {
      this.newZone.patientId = patient.id;
      this.newZone.doctorId  = this.authService.getCurrentUser().id || 1;

      this.mapService.getZoneByPatient(patient.id).subscribe({
        next: (zones) => {
          this.selectedZone = zones.length > 0 ? zones[0] : null;
          if (this.selectedZone) this.newZone = { ...this.selectedZone };
        }
      });

      this.mapService.getAlertsByPatient(patient.id).subscribe({
        next: (data) => this.alerts = data
      });

      this.loadPatientIncidents();

      const marker = this.patientMarkers.get(patient.id);
      if (marker) { this.map.setView(marker.getLatLng(), 15); marker.openPopup(); }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZONE
  // ═══════════════════════════════════════════════════════════════════════════

  startEditZone(): void {
    this.editingZone = true;
    this.activeTab   = 'zone';
    if (this.selectedZone) this.newZone = { ...this.selectedZone };
    this.updatePreviewZone();
  }

  saveZone(): void {
    if (!this.selectedPatient?.id) return;
    const doctorUser = this.authService.getCurrentUser();
    this.newZone.patientId = this.selectedPatient.id;
    this.newZone.doctorId  = doctorUser.id || 1;

    const action = this.newZone.id
      ? this.mapService.updateZone(this.newZone.id, this.newZone)
      : this.mapService.createZone(this.selectedPatient.id, this.newZone.doctorId, this.newZone);

    action.subscribe({
      next: (saved) => {
        this.selectedZone = saved;
        this.editingZone  = false;
        this.clearPreview();
        if (this.selectedPatient?.id) {
          const loc = { latitude: saved.latitudeCentre, longitude: saved.longitudeCentre } as PatientLocation;
          this.loadPatientZones(this.selectedPatient.id, loc);
        }
      }
    });
  }

  cancelEdit(): void { this.editingZone = false; this.clearPreview(); }

  // ═══════════════════════════════════════════════════════════════════════════
  // HÔPITAUX
  // ═══════════════════════════════════════════════════════════════════════════

  loadHospitals(): void {
    this.hospitalService.getAll().subscribe({
      next: (data) => { this.hospitals = data; this.addHospitalMarkers(data); }
    });
  }

  private addHospitalMarkers(hospitals: Hospital[]): void {
    this.hospitalMarkers.forEach(m => m.remove());
    this.hospitalMarkers = [];
    hospitals.forEach(h => {
      if (!h.latitude || !h.longitude) return;
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#dc3545;color:white;border-radius:6px;width:32px;height:32px;
                           display:flex;align-items:center;justify-content:center;font-size:14px;
                           border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🏥</div>`,
        iconSize: [32, 32], iconAnchor: [16, 16]
      });
      const marker = L.marker([h.latitude, h.longitude], { icon })
        .bindPopup(`<div style="min-width:180px">
          <div style="background:#dc3545;color:white;padding:6px 10px;margin:-8px -12px 8px;border-radius:4px 4px 0 0">
            <strong>${h.nom}</strong>
          </div>
          <div style="font-size:12px;padding:4px 0">
            <div>📍 ${h.adresse}, ${h.ville}</div>
            ${h.telephone ? `<div>📞 ${h.telephone}</div>` : ''}
          </div>
          <a href="https://maps.google.com/?q=${h.latitude},${h.longitude}" target="_blank"
             style="display:block;margin-top:6px;padding:3px 8px;background:#0d6efd;color:white;
                    border-radius:4px;text-decoration:none;text-align:center;font-size:11px">Itinéraire</a>
        </div>`)
        .addTo(this.map);
      this.hospitalMarkers.push(marker);
    });
  }

  toggleHospitals(): void {
    this.showHospitals = !this.showHospitals;
    this.hospitalMarkers.forEach(m => this.showHospitals ? m.addTo(this.map) : m.remove());
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ALERTES
  // ═══════════════════════════════════════════════════════════════════════════

  loadHospitalPredictions(): void {
    this.hospitalPredictionService.latest().subscribe({
      next: (data) => {
        this.hospitalPredictions = data || [];
        this.addRecommendedHospitalMarkers();
      },
      error: () => {
        this.hospitalPredictions = [];
        this.recommendedHospitalMarkers.forEach(m => m.remove());
        this.recommendedHospitalMarkers = [];
      }
    });
  }

  private addRecommendedHospitalMarkers(): void {
    this.recommendedHospitalMarkers.forEach(m => m.remove());
    this.recommendedHospitalMarkers = [];

    this.latestRecommendedHospitals.forEach((item) => {
      const hospital = item.hospital;
      if (hospital.latitude == null || hospital.longitude == null) return;

      const isRecommended = hospital.recommande || item.rank === 0;
      const color = isRecommended ? '#198754' : '#6c757d';
      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:38px;height:38px">
                 <div style="background:${color};color:white;border-radius:50% 50% 50% 6px;
                             width:38px;height:38px;transform:rotate(-45deg);
                             display:flex;align-items:center;justify-content:center;
                             border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.35)">
                   <span style="transform:rotate(45deg);font-size:16px;font-weight:800">H</span>
                 </div>
               </div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 38]
      });

      const patientName = this.patientNameById(item.prediction.patientId);
      const marker = L.marker([hospital.latitude, hospital.longitude], { icon, zIndexOffset: isRecommended ? 1200 : 900 })
        .bindPopup(`<div style="min-width:220px">
          <div style="background:${color};color:white;padding:8px 12px;margin:-8px -12px 8px;border-radius:4px 4px 0 0">
            <strong>${isRecommended ? 'Recommande - ' : ''}${hospital.nom}</strong>
          </div>
          <div style="font-size:12px;padding:4px 0">
            <div><b>Patient :</b> ${patientName}</div>
            <div><b>Distance :</b> ${this.hospitalDistance(hospital)} km</div>
            <div><b>Specialite :</b> ${hospital.specialite}</div>
            <div><b>Telephone :</b> ${hospital.telephone}</div>
            <div><b>Adresse :</b> ${hospital.adresse}</div>
          </div>
          <a href="${this.recommendedHospitalMapsUrl(item.prediction, hospital)}" target="_blank"
             style="display:block;margin-top:6px;padding:5px 8px;background:#0d6efd;color:white;
                    border-radius:4px;text-decoration:none;text-align:center;font-size:12px">
            Itineraire
          </a>
        </div>`);

      marker.on('click', () => this.drawHospitalRoute(item.prediction, hospital));

      if (this.showRecommendedHospitals) marker.addTo(this.map);
      this.recommendedHospitalMarkers.push(marker);
    });
  }

  toggleRecommendedHospitals(): void {
    this.showRecommendedHospitals = !this.showRecommendedHospitals;
    this.recommendedHospitalMarkers.forEach(m => this.showRecommendedHospitals ? m.addTo(this.map) : m.remove());
  }

  focusRecommendedHospital(item: { prediction: HospitalPrediction; hospital: RecommendedHospital; rank: number }): void {
    if (item.hospital.latitude == null || item.hospital.longitude == null) return;
    this.map.setView([item.hospital.latitude, item.hospital.longitude], 15);
    this.drawHospitalRoute(item.prediction, item.hospital);
  }

  private predictHospitalForPatient(patient: User, loc: PatientLocation): void {
    if (!patient.id || loc.latitude == null || loc.longitude == null) return;

    const key = `${loc.latitude.toFixed(5)},${loc.longitude.toFixed(5)}`;
    if (this.hospitalPredictionKeys.get(patient.id) === key) return;
    this.hospitalPredictionKeys.set(patient.id, key);

    this.hospitalPredictionService.predict({
      patientId: patient.id,
      patientName: `${patient.nom} ${patient.prenom}`.trim(),
      patientLatitude: loc.latitude,
      patientLongitude: loc.longitude,
      typeIncident: 'malaise'
    }).subscribe({
      next: (prediction) => {
        this.hospitalPredictions = [
          prediction,
          ...this.hospitalPredictions.filter(existing => existing.patientId !== prediction.patientId)
        ];
        this.addRecommendedHospitalMarkers();
      },
      error: () => {}
    });
  }

  private drawHospitalRoute(prediction: HospitalPrediction, hospital: RecommendedHospital): void {
    if (
      prediction.patientLatitude == null ||
      prediction.patientLongitude == null ||
      hospital.latitude == null ||
      hospital.longitude == null
    ) return;

    this.clearHospitalRoute();

    const start = L.latLng(prediction.patientLatitude, prediction.patientLongitude);
    const end = L.latLng(hospital.latitude, hospital.longitude);
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=false`;

    fetch(url)
      .then(response => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.code === 'Ok' && data.routes?.length > 0) {
          const route = data.routes[0];
          const points = route.geometry.coordinates.map(([lng, lat]: [number, number]) => L.latLng(lat, lng));
          this.hospitalRouteLine = L.polyline(points, {
            color: '#198754',
            weight: 6,
            opacity: 0.9
          }).addTo(this.map);

          const distanceKm = (route.distance / 1000).toFixed(1);
          const durationMin = Math.round(route.duration / 60);
          this.hospitalRouteLine.bindTooltip(`Chemin le plus court: ${distanceKm} km - ${durationMin} min`, {
            permanent: false,
            sticky: true
          });
        } else {
          this.hospitalRouteLine = L.polyline([start, end], {
            color: '#198754',
            weight: 4,
            opacity: 0.8,
            dashArray: '8 8'
          }).addTo(this.map);
        }

        this.addHospitalRouteEndpoints(start, end, hospital.nom);
        if (this.hospitalRouteLine) {
          this.map.fitBounds(this.hospitalRouteLine.getBounds(), { padding: [40, 40] });
        }
      })
      .catch(() => {
        this.hospitalRouteLine = L.polyline([start, end], {
          color: '#198754',
          weight: 4,
          opacity: 0.8,
          dashArray: '8 8'
        }).addTo(this.map);
        this.addHospitalRouteEndpoints(start, end, hospital.nom);
        this.map.fitBounds(this.hospitalRouteLine.getBounds(), { padding: [40, 40] });
      });
  }

  private addHospitalRouteEndpoints(start: L.LatLng, end: L.LatLng, hospitalName: string): void {
    const startIcon = L.divIcon({
      className: '',
      html: `<div style="background:#dc3545;color:white;border-radius:50%;width:24px;height:24px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px">P</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    const endIcon = L.divIcon({
      className: '',
      html: `<div style="background:#198754;color:white;border-radius:50%;width:26px;height:26px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px">H</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    this.hospitalRouteEndpointMarkers = [
      L.marker(start, { icon: startIcon, zIndexOffset: 1500 }).bindTooltip('Position patient').addTo(this.map),
      L.marker(end, { icon: endIcon, zIndexOffset: 1500 }).bindTooltip(hospitalName).addTo(this.map)
    ];
  }

  private clearHospitalRoute(): void {
    this.hospitalRouteLine?.remove();
    this.hospitalRouteLine = null;
    this.hospitalRouteEndpointMarkers.forEach(marker => marker.remove());
    this.hospitalRouteEndpointMarkers = [];
  }

  get latestRecommendedHospitals(): { prediction: HospitalPrediction; hospital: RecommendedHospital; rank: number }[] {
    const latestByPatient = new Map<number | string, HospitalPrediction>();
    this.hospitalPredictions.forEach((prediction) => {
      const key = prediction.patientId ?? prediction.alertId ?? prediction.id ?? `${prediction.patientLatitude},${prediction.patientLongitude}`;
      if (!latestByPatient.has(key)) latestByPatient.set(key, prediction);
    });

    const result: { prediction: HospitalPrediction; hospital: RecommendedHospital; rank: number }[] = [];
    latestByPatient.forEach((prediction) => {
      (prediction.hopitaux || []).forEach((hospital, rank) => {
        result.push({ prediction, hospital, rank });
      });
    });
    return result;
  }

  get selectedPatientRecommendedHospital(): { prediction: HospitalPrediction; hospital: RecommendedHospital; rank: number } | null {
    if (!this.selectedPatient?.id) return null;
    return this.latestRecommendedHospitals.find(item =>
      item.prediction.patientId === this.selectedPatient?.id && item.rank === 0
    ) || null;
  }

  patientNameById(patientId?: number): string {
    if (!patientId) return 'Patient';
    const patient = this.patients.find(p => p.id === patientId);
    return patient ? `${patient.nom} ${patient.prenom}` : `Patient ${patientId}`;
  }

  hospitalDistance(hospital: RecommendedHospital): string {
    return hospital.distanceKm || hospital.distance_km || '';
  }

  recommendedHospitalMapsUrl(prediction: HospitalPrediction, hospital: RecommendedHospital): string {
    return `https://www.google.com/maps/dir/?api=1&origin=${prediction.patientLatitude},${prediction.patientLongitude}&destination=${hospital.latitude},${hospital.longitude}`;
  }

  loadAlerts(): void {
    this.mapService.getAllAlerts().subscribe({
      next: (data) => this.alerts = data.filter(a => !a.resolue)
    });
  }

  resolveAlert(id: number): void {
    this.mapService.resolveAlert(id).subscribe({
      next: () => {
        this.alerts = this.alerts.filter(a => a.id !== id);
        if (this.selectedPatient?.id) {
          this.mapService.getAlertsByPatient(this.selectedPatient.id).subscribe({
            next: (data) => this.alerts = data
          });
        }
      }
    });
  }

  get unresolvedAlerts(): GeoAlert[] {
    return this.alerts.filter(a => !a.resolue);
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'HORS_ZONE_ROUGE': return 'fa-triangle-exclamation';
      case 'HORS_ZONE_VERTE': return 'fa-circle-exclamation';
      case 'BATTERIE_FAIBLE': return 'fa-battery-quarter';
      case 'SOS':             return 'fa-bell';
      default:                return 'fa-info-circle';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILS
  // ═══════════════════════════════════════════════════════════════════════════

  refreshAllPositions(): void {
    this.patients.forEach(p => this.loadPatientPosition(p));
    this.loadIncidents();
    this.loadHospitalPredictions();
  }

  get nearestHospital(): Hospital | null {
    if (!this.selectedPatient?.id) return null;
    const marker = this.patientMarkers.get(this.selectedPatient.id);
    if (!marker) return null;
    const { lat, lng } = marker.getLatLng();
    let nearest: Hospital | null = null;
    let minDist = Infinity;
    this.hospitals.forEach(h => {
      if (!h.latitude || !h.longitude) return;
      const d = Math.sqrt((h.latitude - lat) ** 2 + (h.longitude - lng) ** 2);
      if (d < minDist) { minDist = d; nearest = h; }
    });
    return nearest;
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

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS CLIP → INCIDENT
  // ═══════════════════════════════════════════════════════════════════════════

  private emptyIncident() {
    return {
      patientId:    null as number | null,
      type:         null as string | null,
      title:        '',
      description:  '',
      latitude:     null as number | null,
      longitude:    null as number | null,
      aiAnalysis:   null as string | null,
      aiConfidence: null as number | null,
      media:        null as string | null,
      mediaPreview: null as string | null,
    };
  }

  private clipLabelToType(label: string): string {
    const map: Record<string, string> = {
      'dangerous hole': 'TROU', 'obstacle on path': 'OBSTACLE',
      'stairs': 'ESCALIER', 'car accident': 'ACCIDENT',
      'vehicle crash': 'ACCIDENT', 'accident scene': 'ACCIDENT',
      'road blocked by accident': 'ACCIDENT',
      'fallen person on ground': 'CHUTE_PERSONNE', 'injured person': 'CHUTE_PERSONNE',
      'fire or smoke': 'INCENDIE', 'flooding water on path': 'INONDATION',
      'emergency situation': 'ZONE_DANGEREUSE',
      'safe path': 'AUTRE', 'clear road': 'AUTRE', 'door': 'AUTRE',
    };
    return map[label] ?? 'ZONE_DANGEREUSE';
  }

  private typeToTitle(type: string | null): string {
    const map: Record<string, string> = {
      'TROU': 'Trou dangereux détecté', 'OBSTACLE': 'Obstacle sur le chemin',
      'ESCALIER': 'Escaliers détectés', 'ACCIDENT': 'Accident détecté',
      'CHUTE_PERSONNE': 'Personne à terre', 'INCENDIE': 'Incendie ou fumée',
      'INONDATION': 'Inondation sur le chemin', 'ZONE_DANGEREUSE': 'Zone dangereuse',
      'AUTRE': 'Incident détecté',
    };
    return map[type ?? ''] ?? 'Incident détecté';
  }

  private typeToDescription(type: string | null): string {
    const map: Record<string, string> = {
      'TROU': 'Un trou dangereux a été détecté sur le chemin du patient.',
      'OBSTACLE': 'Un obstacle bloque le chemin du patient.',
      'ESCALIER': 'Des escaliers ont été détectés devant le patient.',
      'ACCIDENT': 'Un accident a été détecté. Zone à éviter immédiatement.',
      'CHUTE_PERSONNE': 'Une personne est tombée à terre. Secours nécessaire.',
      'INCENDIE': 'Un feu ou de la fumée a été détecté. Éloignement immédiat.',
      'INONDATION': "De l'eau ou une inondation a été détectée sur le chemin.",
      'ZONE_DANGEREUSE': 'Une situation dangereuse a été détectée sur le chemin.',
      'AUTRE': 'Un incident a été détecté sur le chemin du patient.',
    };
    return map[type ?? ''] ?? '';
  }

  private typeStyle(type: string): { color: string; emoji: string } {
    const map: Record<string, { color: string; emoji: string }> = {
      'TROU':            { color: '#dc3545', emoji: '🕳️' },
      'OBSTACLE':        { color: '#fd7e14', emoji: '🚧' },
      'ESCALIER':        { color: '#ffc107', emoji: '🪜' },
      'ACCIDENT':        { color: '#6f42c1', emoji: '🚨' },
      'CHUTE_PERSONNE':  { color: '#e83e8c', emoji: '🆘' },
      'INCENDIE':        { color: '#fd7e14', emoji: '🔥' },
      'INONDATION':      { color: '#0dcaf0', emoji: '🌊' },
      'ZONE_DANGEREUSE': { color: '#6f42c1', emoji: '☢️' },
    };
    return map[type] ?? { color: '#6c757d', emoji: '⚠️' };
  }
}
