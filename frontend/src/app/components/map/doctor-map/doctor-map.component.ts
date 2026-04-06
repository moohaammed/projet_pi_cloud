import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { MapService } from '../../../services/map.service';
import { AlzUserService } from '../../../services/alz-user.service';
import { AuthService } from '../../../services/auth.service';
import { SafeZone, GeoAlert, PatientLocation } from '../../../models/map.model';
import { User, Role } from '../../../models/user.model';

@Component({
  selector: 'app-doctor-map',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],  // ← ici
  templateUrl: './doctor-map.component.html'
})
export class DoctorMapComponent implements OnInit, OnDestroy {

  private map!: L.Map;
  private patientMarkers: Map<number, L.Marker> = new Map();
  private greenCircles: Map<number, L.Circle> = new Map();
  private redCircles: Map<number, L.Circle> = new Map();

  patients: User[] = [];
  selectedPatient: User | null = null;
  selectedZone: SafeZone | null = null;
  alerts: GeoAlert[] = [];
  loading = false;
  editingZone = false;

  // ← ici newZone
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
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initMap();
    this.loadPatients();
    this.loadAlerts();
    this.refreshInterval = setInterval(() => this.refreshAllPositions(), 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.map) this.map.remove();
  }

  private initMap(): void {
    this.map = L.map('doctor-map', {
      center: [36.8065, 10.1815],
      zoom: 13
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  loadPatients(): void {
    this.alzUserService.getByRole(Role.PATIENT).subscribe({
      next: (data) => {
        this.patients = data;
        data.forEach(p => this.loadPatientPosition(p));
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
    const icon = L.divIcon({
      className: '',
      html: `
        <div style="background:#0d6efd; color:white; border-radius:50%;
                    width:36px; height:36px; display:flex; align-items:center;
                    justify-content:center; font-weight:bold; font-size:12px;
                    border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3)">
          ${patient.nom?.charAt(0)}${patient.prenom?.charAt(0)}
        </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const marker = L.marker([loc.latitude, loc.longitude], { icon })
      .bindPopup(`
        <div style="min-width:180px">
          <strong>${patient.nom} ${patient.prenom}</strong><br>
          <span style="color:#28a745">● En ligne</span><br>
          ${loc.batterie ? `🔋 ${loc.batterie}%<br>` : ''}
          <small>${loc.timestamp ?
            new Date(loc.timestamp).toLocaleString('fr') : ''}</small>
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
                    width:36px; height:36px; display:flex; align-items:center;
                    justify-content:center; font-weight:bold; font-size:12px;
                    border:2px solid white; opacity:0.6">
          ${patient.nom?.charAt(0)}${patient.prenom?.charAt(0)}
        </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    L.marker([36.8065, 10.1815], { icon })
      .bindPopup(`
        <strong>${patient.nom} ${patient.prenom}</strong><br>
        <span style="color:#6c757d">● Hors ligne</span>
      `)
      .addTo(this.map);
  }

  private loadPatientZones(patientId: number, loc: PatientLocation): void {
    this.mapService.getZoneByPatient(patientId).subscribe({
      next: (zones) => {
        zones.forEach(zone => {
          if (!zone.actif) return;
          this.greenCircles.get(patientId)?.remove();
          this.redCircles.get(patientId)?.remove();

          const greenCircle = L.circle(
            [zone.latitudeCentre, zone.longitudeCentre],
            { radius: zone.rayonVert, color: '#28a745',
              fillColor: '#28a745', fillOpacity: 0.1,
              weight: 2, dashArray: '5 5' }
          ).addTo(this.map);

          const redCircle = L.circle(
            [zone.latitudeCentre, zone.longitudeCentre],
            { radius: zone.rayonRouge, color: '#dc3545',
              fillColor: '#dc3545', fillOpacity: 0.05,
              weight: 2, dashArray: '5 5' }
          ).addTo(this.map);

          this.greenCircles.set(patientId, greenCircle);
          this.redCircles.set(patientId, redCircle);
        });
      }
    });
  }

  selectPatient(patient: User): void {
    this.selectedPatient = patient;
    this.editingZone = false;
    if (patient.id) {
      this.newZone.patientId = patient.id;
      this.mapService.getZoneByPatient(patient.id).subscribe({
        next: (zones) => {
          this.selectedZone = zones.length > 0 ? zones[0] : null;
          if (this.selectedZone) {
            this.newZone = { ...this.selectedZone };
          }
        }
      });
    }
  }

  refreshAllPositions(): void {
    this.patients.forEach(p => this.loadPatientPosition(p));
  }

  loadAlerts(): void {
    this.mapService.getAllAlerts().subscribe({
      next: (data) => { this.alerts = data.filter(a => !a.resolue); }
    });
  }

  resolveAlert(id: number): void {
    this.mapService.resolveAlert(id).subscribe({
      next: () => this.loadAlerts()
    });
  }

  saveZone(zone: SafeZone): void {
    const doctorUser = this.authService.getCurrentUser();
    if (!this.selectedPatient?.id) return;

    zone.patientId = this.selectedPatient.id;
    zone.doctorId = doctorUser.userId || doctorUser.id || 1;

    const action = zone.id
      ? this.mapService.updateZone(zone.id, zone)
      : this.mapService.createZone(
          this.selectedPatient.id,
          zone.doctorId,
          zone
        );

    action.subscribe({
      next: (saved) => {
        this.selectedZone = saved;
        this.editingZone = false;
        if (this.selectedPatient?.id) {
          const loc = {
            latitude: saved.latitudeCentre,
            longitude: saved.longitudeCentre
          } as PatientLocation;
          this.loadPatientZones(this.selectedPatient.id, loc);
        }
      }
    });
  }

  get unresolvedAlerts(): GeoAlert[] {
    return this.alerts.filter(a => !a.resolue);
  }

  getAlertColor(type: string): string {
    switch (type) {
      case 'HORS_ZONE_ROUGE': return 'danger';
      case 'HORS_ZONE_VERTE': return 'warning';
      case 'BATTERIE_FAIBLE': return 'secondary';
      case 'SOS': return 'danger';
      default: return 'info';
    }
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'HORS_ZONE_ROUGE': return 'fa-triangle-exclamation';
      case 'HORS_ZONE_VERTE': return 'fa-circle-exclamation';
      case 'BATTERIE_FAIBLE': return 'fa-battery-quarter';
      case 'SOS': return 'fa-bell';
      default: return 'fa-info-circle';
    }
  }
}