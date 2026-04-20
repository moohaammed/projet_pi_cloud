import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AlzUserService } from '../../services/alz-user.service';
import { AuthService } from '../../services/auth.service';
import { MapService } from '../../services/map.service';
import { IncidentService, Incident } from '../../services/incident.service';
import { User } from '../../models/user.model';
import { PatientLocation, GeoAlert } from '../../models/map.model';

@Component({
  selector: 'app-relation-patient-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './relation-patient-profile.component.html',
  styles: [`
    @keyframes fadeUp {
      from { opacity:0; transform:translateY(16px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .fade-up { animation: fadeUp .4s ease both; }
    .fade-up-1 { animation-delay:.05s }
    .fade-up-2 { animation-delay:.12s }
    .fade-up-3 { animation-delay:.20s }
    .fade-up-4 { animation-delay:.28s }
  `]
})
export class RelationPatientProfileComponent implements OnInit {

  currentUser: User | null = null;
  patient:     User | null = null;
  lastLocation: PatientLocation | null = null;
  alerts:       GeoAlert[]  = [];
  incidents:    Incident[]  = [];

  loading      = true;
  isOnline     = false;
  activeSection: 'info' | 'sante' | 'urgences' | 'activite' = 'info';

  constructor(
    private alzUserService:  AlzUserService,
    private authService:     AuthService,
    private mapService:      MapService,
    private incidentService: IncidentService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadPatient();
  }

  private loadPatient(): void {
    if (!this.currentUser?.id) return;

    this.alzUserService.getLinkedPatient(this.currentUser.id).subscribe({
      next: (p: User) => {
        this.patient = p;
        this.loading = false;
        this.loadExtras();
      },
      error: () => {
        // fallback via patientId dans le profil
        const pid = (this.currentUser as any)?.patientId;
        if (pid) {
          this.alzUserService.getById(pid).subscribe({
            next: (p: User) => { this.patient = p; this.loading = false; this.loadExtras(); },
            error: () => { this.loading = false; }
          });
        } else {
          this.loading = false;
        }
      }
    });
  }

  private loadExtras(): void {
    if (!this.patient?.id) return;

    // Dernière position
    this.mapService.getLastLocation(this.patient.id).subscribe({
      next: (loc: PatientLocation) => { this.lastLocation = loc; this.isOnline = true; },
      error: () => { this.isOnline = false; }
    });

    // Alertes
    this.mapService.getAlertsByPatient(this.patient.id).subscribe({
      next: (data: GeoAlert[]) => this.alerts = data
    });

    // Incidents
    this.incidentService.getByPatient(this.patient.id).subscribe({
      next: (data: Incident[]) => this.incidents = data
    });
  }

  // ── Getters ──────────────────────────────────────────────────
  get initials(): string {
    return `${this.patient?.nom?.charAt(0) ?? '?'}${this.patient?.prenom?.charAt(0) ?? ''}`;
  }

  get age(): number | null {
    const dob = (this.patient as any)?.dateNaissance;
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  }

  get unresolvedAlerts(): GeoAlert[] {
    return this.alerts.filter(a => !a.resolue);
  }

  get activeIncidents(): Incident[] {
    return this.incidents.filter(i => i.status === 'EN_COURS');
  }

  get lastSeen(): string {
    if (!this.lastLocation?.timestamp) return 'Inconnu';
    return new Date(this.lastLocation.timestamp).toLocaleString('fr');
  }

  get batteryColor(): string {
    const b = this.lastLocation?.batterie ?? 100;
    return b < 20 ? '#dc3545' : b < 50 ? '#ffc107' : '#198754';
  }

  alertIcon(type: string): string {
    const m: Record<string, string> = {
      'HORS_ZONE_ROUGE': 'fa-triangle-exclamation',
      'HORS_ZONE_VERTE': 'fa-circle-exclamation',
      'BATTERIE_FAIBLE': 'fa-battery-quarter',
      'SOS':             'fa-bell',
    };
    return m[type] ?? 'fa-info-circle';
  }

  alertColor(type: string): string {
    return type === 'HORS_ZONE_ROUGE' || type === 'SOS' ? '#dc3545'
         : type === 'HORS_ZONE_VERTE' ? '#fd7e14' : '#6c757d';
  }

  incidentEmoji(type: string): string {
    const m: Record<string, string> = {
      'TROU': '🕳️', 'OBSTACLE': '🚧', 'ESCALIER': '🪜',
      'ACCIDENT': '🚨', 'CHUTE_PERSONNE': '🆘',
      'INCENDIE': '🔥', 'INONDATION': '🌊',
    };
    return m[type] ?? '⚠️';
  }
}