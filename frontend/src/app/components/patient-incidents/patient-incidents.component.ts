import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IncidentService, Incident } from '../../services/incident.service';
import { MapService } from '../../services/map.service';
import { AuthService } from '../../services/auth.service';

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

  constructor(
    private incidentService: IncidentService,
    private mapService: MapService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    const id = user?.id ?? user?.userId;

    if (!id) {
      this.error = 'Utilisateur non authentifié.';
      this.loading = false;
      return;
    }

    // Étape 1 — Récupère la zone du patient
    this.mapService.getZoneByPatient(id).subscribe({
      next: (zones) => {
        if (!zones || zones.length === 0) {
          // Pas de zone définie → affiche message
          this.zoneDefinie = false;
          this.loading = false;
          return;
        }

        const zone = zones[0];
        this.zoneDefinie = true;
        this.rayonZone = zone.rayonVert ?? 200;

        // Étape 2 — Charge tous les incidents
        this.incidentService.getAll().subscribe({
          next: (data) => {
            // Étape 3 — Filtre par distance (zone verte)
            this.incidents = data.filter(inc => {
              if (!inc.latitude || !inc.longitude) return false;
              const dist = this.haversine(
                zone.latitudeCentre,
                zone.longitudeCentre,
                inc.latitude,
                inc.longitude
              );
              return dist <= zone.rayonVert; // ← dans la zone verte
            });
            this.loading = false;
          },
          error: () => {
            this.error = 'Impossible de charger les incidents.';
            this.loading = false;
          }
        });
      },
      error: () => {
        this.zoneDefinie = false;
        this.loading = false;
      }
    });
  }

  // Calcul distance Haversine en mètres
  private haversine(lat1: number, lng1: number,
                     lat2: number, lng2: number): number {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(Δφ/2)**2 +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      EN_COURS: 'badge-en-cours',
      RESOLU:   'badge-resolu',
      FERME:    'badge-ferme'
    };
    return map[status] ?? '';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      EN_COURS: 'En cours',
      RESOLU:   'Résolu',
      FERME:    'Fermé'
    };
    return map[status] ?? status;
  }

  typeIcon(type: string): string {
    const map: Record<string, string> = {
      TROU:            'fa-circle-exclamation',
      OBSTACLE:        'fa-road-barrier',
      ESCALIER:        'fa-stairs',
      CHUTE:           'fa-person-falling',
      ZONE_DANGEREUSE: 'fa-radiation',
      AUTRE:           'fa-info-circle'
    };
    return map[type] ?? 'fa-info-circle';
  }
}