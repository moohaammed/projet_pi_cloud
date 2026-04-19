import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { MapService } from '../../../services/map.service';
import { AlzUserService } from '../../../services/alz-user.service';
import { AuthService } from '../../../services/auth.service';
import { HospitalService } from '../../../services/hospital.service';
import { SafeZone, GeoAlert, PatientLocation } from '../../../models/map.model';
import { User, Role } from '../../../models/user.model';
import { Hospital } from '../../../models/hospital.model';

@Component({
  selector: 'app-doctor-map',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './doctor-map.component.html'
})
export class DoctorMapComponent implements OnInit, AfterViewInit, OnDestroy {

  private map!: L.Map;
  private patientMarkers: Map<number, L.Marker>  = new Map();
  private greenCircles:   Map<number, L.Circle>  = new Map();
  private redCircles:     Map<number, L.Circle>  = new Map();
  private historyLayers:  Map<number, L.Polyline[]> = new Map();
  private hospitalMarkers: L.Marker[] = [];
  private centerMarker: L.Marker | null = null;
  private houseMarkers: Map<number, L.Marker> = new Map(); // ← ajoute ça

  patients:         User[]     = [];
  hospitals:        Hospital[] = [];
  selectedPatient:  User | null = null;
  selectedZone:     SafeZone | null = null;
  alerts:           GeoAlert[] = [];
  history:          PatientLocation[] = [];

  loading       = false;
  editingZone   = false;
  showHospitals = true;
  showHistory   = false;
  activeTab: 'zone' | 'history' | 'alerts' = 'zone';

  newZone: SafeZone = {
    patientId: 0,
    doctorId: 0,
    latitudeCentre: 36.8065,
    longitudeCentre: 10.1815,
    rayonVert: 200,
    rayonRouge: 500,
    actif: true
  };

  private refreshInterval: any;

  constructor(
    private mapService: MapService,
    private alzUserService: AlzUserService,
    private authService: AuthService,
    private hospitalService: HospitalService
  ) {}

 ngOnInit(): void {
  this.refreshInterval = setInterval(() => this.refreshAllPositions(), 15000);
}

ngAfterViewInit(): void {
  setTimeout(() => {
    this.initMap();
    this.loadPatients();
    this.loadHospitals();  // ← après initMap()
    this.loadAlerts();
  }, 300);
}

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.map) this.map.remove();
  }

  // ===== MAP INIT =====
  private initMap(): void {
    this.map = L.map('doctor-map', {
      center: [36.8065, 10.1815],
      zoom: 13
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Clic sur la carte = définir centre de zone
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.editingZone) {
        this.newZone.latitudeCentre  = e.latlng.lat;
        this.newZone.longitudeCentre = e.latlng.lng;
        this.updatePreviewZone();
      }
    });
  }

  // ===== PREVIEW ZONE en temps réel =====
  private previewGreen: L.Circle | null = null;
  private previewRed: L.Circle | null = null;


  updatePreviewZone(): void {
  this.previewGreen?.remove();
  this.previewRed?.remove();

  this.previewGreen = L.circle(
    [this.newZone.latitudeCentre, this.newZone.longitudeCentre],
    { radius: this.newZone.rayonVert, color: '#28a745',
      fillColor: '#28a745', fillOpacity: 0.15, weight: 2, dashArray: '5 5' }
  ).addTo(this.map);

  this.previewRed = L.circle(
    [this.newZone.latitudeCentre, this.newZone.longitudeCentre],
    { radius: this.newZone.rayonRouge, color: '#dc3545',
      fillColor: '#dc3545', fillOpacity: 0.07, weight: 2, dashArray: '5 5' }
  ).addTo(this.map);

  // ← ICÔNE MAISON 3D
  const houseIcon = L.divIcon({
    className: '',
    html: `
      <div style="
        position: relative;
        width: 50px;
        height: 50px;
        filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.4));
      ">
        <!-- Toit 3D -->
        <div style="
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 26px solid transparent;
          border-right: 26px solid transparent;
          border-bottom: 20px solid #c0392b;
          filter: drop-shadow(1px -1px 0 #922b21);
        "></div>
        <!-- Côté toit 3D -->
        <div style="
          position: absolute;
          top: 8px; left: 50%;
          transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 22px solid transparent;
          border-right: 22px solid transparent;
          border-bottom: 16px solid #e74c3c;
        "></div>
        <!-- Mur principal -->
        <div style="
          position: absolute;
          bottom: 0; left: 50%;
          transform: translateX(-50%);
          width: 36px; height: 26px;
          background: linear-gradient(135deg, #f5f0e8, #e8dcc8);
          border: 1px solid #c8b99a;
          border-radius: 0 0 2px 2px;
        ">
          <!-- Porte -->
          <div style="
            position: absolute;
            bottom: 0; left: 50%;
            transform: translateX(-50%);
            width: 10px; height: 14px;
            background: linear-gradient(135deg, #8B4513, #6B3410);
            border-radius: 3px 3px 0 0;
          "></div>
          <!-- Fenêtre gauche -->
          <div style="
            position: absolute;
            top: 4px; left: 3px;
            width: 8px; height: 7px;
            background: linear-gradient(135deg, #85c1e9, #5dade2);
            border: 1px solid #aaa;
            border-radius: 1px;
          "></div>
          <!-- Fenêtre droite -->
          <div style="
            position: absolute;
            top: 4px; right: 3px;
            width: 8px; height: 7px;
            background: linear-gradient(135deg, #85c1e9, #5dade2);
            border: 1px solid #aaa;
            border-radius: 1px;
          "></div>
        </div>
        <!-- Côté 3D de la maison -->
        <div style="
          position: absolute;
          bottom: 0;
          left: calc(50% + 18px);
          width: 8px; height: 26px;
          background: linear-gradient(135deg, #c8b99a, #a89070);
          border-right: 1px solid #c8b99a;
          transform: skewY(-30deg);
          transform-origin: bottom left;
        "></div>
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 50]
  });

  if (this.centerMarker) {
    this.centerMarker.setLatLng([
      this.newZone.latitudeCentre,
      this.newZone.longitudeCentre
    ]);
    this.centerMarker.setIcon(houseIcon);
  } else {
    this.centerMarker = L.marker(
      [this.newZone.latitudeCentre, this.newZone.longitudeCentre],
      { icon: houseIcon, draggable: true }
    ).addTo(this.map);

    this.centerMarker.on('dragend', (e: any) => {
      const latlng = e.target.getLatLng();
      this.newZone.latitudeCentre  = latlng.lat;
      this.newZone.longitudeCentre = latlng.lng;
      this.updatePreviewZone();
    });
  }

  this.map.setView(
    [this.newZone.latitudeCentre, this.newZone.longitudeCentre],
    15
  );
}
private getHouseIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative; width:50px; height:50px;
                  filter:drop-shadow(2px 4px 6px rgba(0,0,0,0.4))">
        <div style="position:absolute; top:0; left:50%;
                    transform:translateX(-50%);
                    width:0; height:0;
                    border-left:26px solid transparent;
                    border-right:26px solid transparent;
                    border-bottom:20px solid #c0392b"></div>
        <div style="position:absolute; top:8px; left:50%;
                    transform:translateX(-50%);
                    width:0; height:0;
                    border-left:22px solid transparent;
                    border-right:22px solid transparent;
                    border-bottom:16px solid #e74c3c"></div>
        <div style="position:absolute; bottom:0; left:50%;
                    transform:translateX(-50%);
                    width:36px; height:26px;
                    background:linear-gradient(135deg,#f5f0e8,#e8dcc8);
                    border:1px solid #c8b99a;
                    border-radius:0 0 2px 2px">
          <div style="position:absolute; bottom:0; left:50%;
                      transform:translateX(-50%);
                      width:10px; height:14px;
                      background:linear-gradient(135deg,#8B4513,#6B3410);
                      border-radius:3px 3px 0 0"></div>
          <div style="position:absolute; top:4px; left:3px;
                      width:8px; height:7px;
                      background:linear-gradient(135deg,#85c1e9,#5dade2);
                      border:1px solid #aaa; border-radius:1px"></div>
          <div style="position:absolute; top:4px; right:3px;
                      width:8px; height:7px;
                      background:linear-gradient(135deg,#85c1e9,#5dade2);
                      border:1px solid #aaa; border-radius:1px"></div>
        </div>
        <div style="position:absolute; bottom:0;
                    left:calc(50% + 18px);
                    width:8px; height:26px;
                    background:linear-gradient(135deg,#c8b99a,#a89070);
                    transform:skewY(-30deg);
                    transform-origin:bottom left"></div>
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 50]
  });
}

  clearPreview(): void {
    this.previewGreen?.remove();
    this.previewRed?.remove();
    this.centerMarker?.remove();
    this.previewGreen  = null;
    this.previewRed    = null;
    this.centerMarker  = null;
  }

  // ===== PATIENTS =====
 loadPatients(): void {
  this.alzUserService.getByRole(Role.PATIENT).subscribe({
    next: (data) => {
      this.patients = data;
      data.forEach(p => this.loadPatientPosition(p)); // ← sans if (this.map)
    }
  });
}

  loadPatientPosition(patient: User): void {
    if (!patient.id) return;
    this.mapService.getLastLocation(patient.id).subscribe({
      next: (loc) => this.addPatientMarker(patient, loc),
      error: () => this.addOfflineMarker(patient)
    });
  }

  private addPatientMarker(patient: User, loc: PatientLocation): void {
    const batterie = loc.batterie ?? 100;
    const bColor = batterie < 20 ? '#dc3545' : batterie < 50 ? '#ffc107' : '#28a745';

    const icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative">
          <div style="background:#0d6efd; color:white; border-radius:50%;
                      width:42px; height:42px; display:flex; align-items:center;
                      justify-content:center; font-weight:bold; font-size:13px;
                      border:3px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.3)">
            ${patient.nom?.charAt(0)}${patient.prenom?.charAt(0)}
          </div>
          <div style="position:absolute; bottom:-2px; right:-2px; background:${bColor};
                      border-radius:50%; width:14px; height:14px;
                      border:2px solid white; font-size:8px;
                      display:flex; align-items:center; justify-content:center;
                      color:white; font-weight:bold">
            ${batterie < 20 ? '!' : ''}
          </div>
        </div>`,
      iconSize: [42, 42], iconAnchor: [21, 21]
    });

    this.patientMarkers.get(patient.id!)?.remove();

    const marker = L.marker([loc.latitude, loc.longitude], { icon })
      .bindPopup(`
        <div style="min-width:180px">
          <div style="background:#0d6efd; color:white; padding:8px 12px;
                      margin:-8px -12px 8px; border-radius:4px 4px 0 0">
            <strong>${patient.nom} ${patient.prenom}</strong>
          </div>
          <div style="padding:4px 0; font-size:13px">
            <div style="color:#28a745; font-weight:bold">● En ligne</div>
            <div>🔋 <span style="color:${bColor}; font-weight:bold">${batterie}%</span></div>
            <div style="color:#888; font-size:11px">
              ${loc.timestamp ? new Date(loc.timestamp).toLocaleString('fr') : ''}
            </div>
          </div>
        </div>
      `);

    marker.addTo(this.map);
    this.patientMarkers.set(patient.id!, marker);
    this.loadPatientZones(patient.id!, loc);
  }

  private addOfflineMarker(patient: User): void {
    if (!patient.id) return;
    const icon = L.divIcon({
      className: '',
      html: `
        <div style="background:#6c757d; color:white; border-radius:50%;
                    width:42px; height:42px; display:flex; align-items:center;
                    justify-content:center; font-weight:bold; font-size:13px;
                    border:3px solid white; opacity:0.6">
          ${patient.nom?.charAt(0)}${patient.prenom?.charAt(0)}
        </div>`,
      iconSize: [42, 42], iconAnchor: [21, 21]
    });

    this.patientMarkers.get(patient.id!)?.remove();
    const marker = L.marker([36.8065, 10.1815], { icon })
      .bindPopup(`<strong>${patient.nom} ${patient.prenom}</strong><br>
                  <span style="color:#6c757d">● Hors ligne</span>`);
    marker.addTo(this.map);
    this.patientMarkers.set(patient.id!, marker);
  }
  private loadPatientZones(patientId: number, loc: PatientLocation): void {
  this.mapService.getZoneByPatient(patientId).subscribe({
    next: (zones) => {
      this.greenCircles.get(patientId)?.remove();
      this.redCircles.get(patientId)?.remove();
      this.houseMarkers.get(patientId)?.remove(); // ← supprime ancienne maison

      zones.forEach(zone => {
        if (!zone.actif) return;

        const green = L.circle(
          [zone.latitudeCentre, zone.longitudeCentre],
          { radius: zone.rayonVert, color: '#28a745',
            fillColor: '#28a745', fillOpacity: 0.1,
            weight: 2, dashArray: '5 5' }
        ).bindTooltip(`Zone verte — ${zone.rayonVert}m`).addTo(this.map);

        const red = L.circle(
          [zone.latitudeCentre, zone.longitudeCentre],
          { radius: zone.rayonRouge, color: '#dc3545',
            fillColor: '#dc3545', fillOpacity: 0.05,
            weight: 2, dashArray: '5 5' }
        ).bindTooltip(`Zone rouge — ${zone.rayonRouge}m`).addTo(this.map);

        // ← MAISON 3D toujours visible
        const house = L.marker(
          [zone.latitudeCentre, zone.longitudeCentre],
          { icon: this.getHouseIcon() }
        ).bindPopup(`
          <div style="text-align:center">
            <b>🏠 Maison de ${this.selectedPatient?.prenom}</b><br>
            <small>Zone verte : ${zone.rayonVert}m</small><br>
            <small>Zone rouge : ${zone.rayonRouge}m</small>
          </div>
        `).addTo(this.map);

        this.greenCircles.set(patientId, green);
        this.redCircles.set(patientId, red);
        this.houseMarkers.set(patientId, house); // ← stocke la maison
      });
    }
  });
}
  

  // ===== HISTORIQUE 7 JOURS =====
  loadHistory(patientId: number): void {
    this.mapService.getHistory(patientId).subscribe({
      next: (data) => {
        this.history = data;
        this.drawHistory(patientId, data);
      }
    });
  }

  utiliserPositionActuelle(): void {
  if (!this.selectedPatient?.id) return;
  
  this.mapService.getLastLocation(this.selectedPatient.id).subscribe({
    next: (loc) => {
      this.newZone.latitudeCentre = loc.latitude;
      this.newZone.longitudeCentre = loc.longitude;
      this.updatePreviewZone();
    },
    error: () => console.error('Position non disponible')
  });
}
centrerSurMaison(): void {
  if (!this.selectedZone) return;
  this.map.setView(
    [this.selectedZone.latitudeCentre, this.selectedZone.longitudeCentre],
    16
  );
}
  private drawHistory(patientId: number, locations: PatientLocation[]): void {
    // Supprime ancien historique
    const old = this.historyLayers.get(patientId) || [];
    old.forEach(l => l.remove());

    if (locations.length < 2) return;

    // Filtre 7 derniers jours
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recent = locations.filter(l =>
      l.timestamp && new Date(l.timestamp) >= sevenDaysAgo
    );

    if (recent.length < 2) return;

    const points: L.LatLng[] = recent.map(l =>
      L.latLng(l.latitude, l.longitude)
    );

    const line = L.polyline(points, {
      color: '#6f42c1',
      weight: 3,
      opacity: 0.7,
      dashArray: '6 4'
    }).addTo(this.map);

    // Point de départ
    const startIcon = L.divIcon({
      className: '',
      html: `<div style="background:#6f42c1; color:white; border-radius:50%;
                         width:14px; height:14px; border:2px solid white"></div>`,
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

    if (this.showHistory) {
      this.loadHistory(this.selectedPatient.id);
    } else {
      this.clearHistory(this.selectedPatient.id);
    }
  }

  // ===== SÉLECTION PATIENT =====
  selectPatient(patient: User): void {
    this.selectedPatient = patient;
    this.editingZone     = false;
    this.showHistory     = false;
    this.activeTab       = 'zone';
    this.clearPreview();

    if (patient.id) {
      this.newZone.patientId = patient.id;
      this.newZone.doctorId  = this.authService.getCurrentUser().id || 1;

      this.mapService.getZoneByPatient(patient.id).subscribe({
        next: (zones) => {
          this.selectedZone = zones.length > 0 ? zones[0] : null;
          if (this.selectedZone) {
            this.newZone = { ...this.selectedZone };
          }
        }
      });

      this.mapService.getAlertsByPatient(patient.id).subscribe({
        next: (data) => this.alerts = data
      });

      const marker = this.patientMarkers.get(patient.id);
      if (marker) {
        this.map.setView(marker.getLatLng(), 15);
        marker.openPopup();
      }
    }
  }

  // ===== ZONE =====
  startEditZone(): void {
    this.editingZone = true;
    this.activeTab   = 'zone';
    if (this.selectedZone) {
      this.newZone = { ...this.selectedZone };
    }
    this.updatePreviewZone();
  }

  saveZone(): void {
    if (!this.selectedPatient?.id) return;
    const doctorUser = this.authService.getCurrentUser();
    this.newZone.patientId = this.selectedPatient.id;
    this.newZone.doctorId  = doctorUser.id || 1;

    const action = this.newZone.id
      ? this.mapService.updateZone(this.newZone.id, this.newZone)
      : this.mapService.createZone(
          this.selectedPatient.id,
          this.newZone.doctorId,
          this.newZone
        );

    action.subscribe({
      next: (saved) => {
        this.selectedZone = saved;
        this.editingZone  = false;
        this.clearPreview();
        if (this.selectedPatient?.id) {
          const loc = {
            latitude:  saved.latitudeCentre,
            longitude: saved.longitudeCentre
          } as PatientLocation;
          this.loadPatientZones(this.selectedPatient.id, loc);
        }
      }
    });
  }

  cancelEdit(): void {
    this.editingZone = false;
    this.clearPreview();
  }

  // ===== HÔPITAUX =====
  loadHospitals(): void {
  this.hospitalService.getAll().subscribe({
    next: (data) => {
      this.hospitals = data;
      this.addHospitalMarkers(data); // ← sans if (this.map)
    }
  });
}

  private addHospitalMarkers(hospitals: Hospital[]): void {
    this.hospitalMarkers.forEach(m => m.remove());
    this.hospitalMarkers = [];

    hospitals.forEach(h => {
      if (!h.latitude || !h.longitude) return;

      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#dc3545; color:white; border-radius:6px;
                           width:32px; height:32px; display:flex; align-items:center;
                           justify-content:center; font-size:14px;
                           border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3)">
                 <i class="fa-solid fa-hospital"></i>
               </div>`,
        iconSize: [32, 32], iconAnchor: [16, 16]
      });

      const marker = L.marker([h.latitude, h.longitude], { icon })
        .bindPopup(`
          <div style="min-width:180px">
            <div style="background:#dc3545; color:white; padding:6px 10px;
                        margin:-8px -12px 8px; border-radius:4px 4px 0 0">
              <strong>${h.nom}</strong>
            </div>
            <div style="font-size:12px; padding:4px 0">
              <div>📍 ${h.adresse}, ${h.ville}</div>
              ${h.telephone ? `<div>📞 ${h.telephone}</div>` : ''}
              ${h.rating ? `<div>⭐ ${h.rating}/5</div>` : ''}
            </div>
            <a href="https://maps.google.com/?q=${h.latitude},${h.longitude}"
               target="_blank"
               style="display:block; margin-top:6px; padding:3px 8px;
                      background:#0d6efd; color:white; border-radius:4px;
                      text-decoration:none; text-align:center; font-size:11px">
              Itinéraire
            </a>
          </div>
        `)
        .addTo(this.map);

      this.hospitalMarkers.push(marker);
    });
  }

  toggleHospitals(): void {
    this.showHospitals = !this.showHospitals;
    this.hospitalMarkers.forEach(m => {
      if (this.showHospitals) m.addTo(this.map);
      else m.remove();
    });
  }

  // ===== ALERTES =====
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

  // ===== UTILS =====
  refreshAllPositions(): void {
    this.patients.forEach(p => this.loadPatientPosition(p));
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

  get nearestHospital(): Hospital | null {
    if (!this.selectedPatient?.id) return null;
    const marker = this.patientMarkers.get(this.selectedPatient.id);
    if (!marker) return null;

    const { lat, lng } = marker.getLatLng();
    let nearest: Hospital | null = null;
    let minDist = Infinity;

    this.hospitals.forEach(h => {
      if (!h.latitude || !h.longitude) return;
      const d = Math.sqrt(
        Math.pow(h.latitude  - lat, 2) +
        Math.pow(h.longitude - lng, 2)
      );
      if (d < minDist) { minDist = d; nearest = h; }
    });
    return nearest;
  }

  getHistoryStats(): { total: number, distance: string } {
    if (this.history.length < 2) return { total: 0, distance: '0' };

    let dist = 0;
    for (let i = 1; i < this.history.length; i++) {
      const a = this.history[i - 1];
      const b = this.history[i];
      dist += this.haversine(a.latitude, a.longitude, b.latitude, b.longitude);
    }
    return {
      total:    this.history.length,
      distance: (dist / 1000).toFixed(1)
    };
  }

  private haversine(lat1: number, lng1: number,
                     lat2: number, lng2: number): number {
    const R  = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a  = Math.sin(Δφ/2)**2 +
               Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}