import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { IncidentService, Incident } from '../../services/incident.service';
import { MapService } from '../../services/map.service';
import { AuthService } from '../../services/auth.service';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-patient-incidents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-incidents.component.html',
  styleUrl: './patient-incidents.component.css'
})
export class PatientIncidentsComponent implements OnInit {

  incidents: Incident[] = [];
  loading = true;
  error = '';
  zoneDefinie = false;
  rayonZone = 0;
  incidentAddresses: Record<string, string> = {};

  constructor(
    private incidentService: IncidentService,
    private mapService: MapService,
    private auth: AuthService,
    private patientService: PatientService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    const userId = user?.id ?? user?.userId;

    if (!userId) {
      this.error = 'Utilisateur non authentifie.';
      this.loading = false;
      return;
    }

    this.patientService.getPatientByUserId(userId).subscribe({
      next: (patient) => this.loadIncidentsForIds(this.uniqueIds(userId, patient?.id)),
      error: () => this.loadIncidentsForIds([userId])
    });
  }

  private loadIncidentsForIds(patientIds: number[]): void {
    let remaining = patientIds.length;
    const allZones: any[] = [];

    if (!remaining) {
      this.loading = false;
      return;
    }

    const done = () => {
      remaining--;
      if (remaining > 0) return;

      this.zoneDefinie = allZones.length > 0;
      this.rayonZone = allZones[0]?.rayonVert ?? 0;

      if (!this.zoneDefinie) {
        this.loading = false;
        return;
      }

      this.incidentService.getAll().subscribe({
        next: (data) => {
          this.incidents = this.dedupeIncidents(data || [])
            .filter(inc => this.isActiveIncident(inc))
            .filter(inc => this.isInsideGreenZone(inc, allZones));
          this.loadIncidentAddresses();
          this.loading = false;
        },
        error: () => {
          this.error = 'Impossible de charger les incidents.';
          this.loading = false;
        }
      });
    };

    patientIds.forEach(patientId => {
      this.mapService.getZoneByPatient(patientId).subscribe({
        next: (zones) => {
          allZones.push(...(zones || []));
          done();
        },
        error: () => done()
      });
    });
  }

  private uniqueIds(...ids: Array<number | null | undefined>): number[] {
    return Array.from(new Set(ids.filter((id): id is number => !!id)));
  }

  private dedupeIncidents(incidents: Incident[]): Incident[] {
    const seen = new Set<string>();
    return incidents.filter(incident => {
      const key = incident.id ?? `${incident.patientId}-${incident.latitude}-${incident.longitude}-${incident.createdAt}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private isInsideGreenZone(inc: Incident, zones: any[]): boolean {
    if (!inc.latitude || !inc.longitude) return false;
    return zones.some(zone => {
      if (!zone.latitudeCentre || !zone.longitudeCentre || !zone.rayonVert) return false;
      const dist = this.haversine(zone.latitudeCentre, zone.longitudeCentre, inc.latitude!, inc.longitude!);
      return dist <= zone.rayonVert;
    });
  }

  private isActiveIncident(inc: Incident): boolean {
    return inc.status !== 'RESOLU' && inc.status !== 'FERME';
  }

  private loadIncidentAddresses(): void {
    this.incidents.forEach(incident => {
      const key = this.incidentKey(incident);
      if (!incident.latitude || !incident.longitude || this.incidentAddresses[key]) return;

      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${incident.latitude}&lon=${incident.longitude}&zoom=18&addressdetails=1`;
      this.http.get<any>(url).subscribe({
        next: (res) => {
          this.incidentAddresses[key] = res?.display_name || 'Adresse non disponible';
        },
        error: () => {
          this.incidentAddresses[key] = 'Adresse non disponible';
        }
      });
    });
  }

  addressFor(incident: Incident): string {
    return this.incidentAddresses[this.incidentKey(incident)] || 'Recherche de l adresse...';
  }

  private incidentKey(incident: Incident): string {
    return incident.id ?? `${incident.latitude}-${incident.longitude}-${incident.createdAt}`;
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const radius = 6371000;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(deltaPhi / 2) ** 2 +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      EN_COURS: 'badge-en-cours',
      RESOLU: 'badge-resolu',
      FERME: 'badge-ferme'
    };
    return map[status] ?? '';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      EN_COURS: 'En cours',
      RESOLU: 'Resolue',
      FERME: 'Ferme'
    };
    return map[status] ?? status;
  }

  typeIcon(type: string): string {
    const map: Record<string, string> = {
      TROU: 'fa-circle-exclamation',
      OBSTACLE: 'fa-road-barrier',
      ESCALIER: 'fa-stairs',
      ACCIDENT: 'fa-car-burst',
      CHUTE_PERSONNE: 'fa-person-falling',
      INCENDIE: 'fa-fire',
      INONDATION: 'fa-water',
      CHUTE: 'fa-person-falling',
      ZONE_DANGEREUSE: 'fa-radiation',
      AUTRE: 'fa-info-circle'
    };
    return map[type] ?? 'fa-info-circle';
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      TROU: 'Trou',
      OBSTACLE: 'Obstacle',
      ESCALIER: 'Escalier',
      ACCIDENT: 'Accident',
      CHUTE_PERSONNE: 'Personne tombee',
      INCENDIE: 'Incendie',
      INONDATION: 'Inondation',
      CHUTE: 'Chute',
      ZONE_DANGEREUSE: 'Zone dangereuse',
      AUTRE: 'Autre'
    };
    return map[type] ?? type;
  }

  patientFriendlyDescription(inc: Incident): string {
    if (inc.description) {
      return inc.description;
    }

    const map: Record<string, string> = {
      TROU: 'Attention, il y a un trou dans cette zone. Marchez doucement ou demandez de l aide.',
      OBSTACLE: 'Attention, un objet bloque le passage dans cette zone. Evitez ce chemin.',
      ESCALIER: 'Attention, il y a des escaliers dans cette zone. Utilisez la rampe ou demandez de l aide.',
      ACCIDENT: 'Attention, un accident a ete signale dans cette zone. Ne vous approchez pas.',
      CHUTE_PERSONNE: 'Attention, une personne est tombee dans cette zone. Demandez de l aide.',
      INCENDIE: 'Danger, feu ou fumee signalee dans cette zone. Eloignez-vous.',
      INONDATION: 'Attention, il y a de l eau dans cette zone. Evitez ce passage.',
      CHUTE: 'Attention, risque de chute dans cette zone. Marchez lentement.',
      ZONE_DANGEREUSE: 'Attention, cette zone peut etre dangereuse. Restez prudent.',
      AUTRE: 'Un incident a ete signale dans cette zone. Restez prudent.'
    };

    return map[inc.type] ?? 'Un incident a ete signale dans cette zone. Restez prudent.';
  }
}
