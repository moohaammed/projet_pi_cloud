import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AlzUserService } from '../../../services/alz-user.service';
import { AuthService } from '../../../services/auth.service';
import { User, Role } from '../../../models/user.model';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './patient-detail.component.html'
})
export class PatientDetailComponent implements OnInit {

  patient:  any = null;
  relation: any = null;   // ← compte RELATION lié au patient
  loading      = true;
  isAdmin      = false;
  isDoctor     = false;

  constructor(
    private route:          ActivatedRoute,
    private router:         Router,
    private alzUserService: AlzUserService,
    private authService:    AuthService
  ) {}

  ngOnInit(): void {
    const role    = this.authService.getRole();
    this.isAdmin  = role === 'ADMIN';
    this.isDoctor = role === 'DOCTOR';

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.alzUserService.getById(+id).subscribe({
        next: (data) => {
          this.patient = data;
          this.loading = false;
          // ── Charger la relation liée si relationId existe ──
          const anyData = data as any;
          const relationId = anyData?.relationId ?? anyData?.relation_id;
          if (relationId) {
            this.alzUserService.getById(relationId).subscribe({
              next: (rel) => this.relation = rel,
              error: () => this.relation = null
            });
          } else {
            // Fallback : chercher via role RELATION + patientId
            this.loadRelationByPatientId(+id);
          }
        },
        error: () => this.loading = false
      });
    }
  }

  /** Cherche l'utilisateur RELATION dont le patientId = id du patient */
  private loadRelationByPatientId(patientId: number): void {
    this.alzUserService.getAll().subscribe({
      next: (users: User[]) => {
        this.relation = users.find(
          u => u.role === Role.RELATION &&
               ((u as any).patientId === patientId ||
                (u as any).patient_id === patientId)
        ) ?? null;
      }
    });
  }

  toggleActif(): void {
    if (!this.patient?.id) return;
    this.alzUserService.toggleActif(this.patient.id).subscribe({
      next: (data) => this.patient = data
    });
  }

  getAge(): number | null {
    if (!this.patient?.dateNaissance) return null;
    const today = new Date();
    const birth = new Date(this.patient.dateNaissance);
    if (isNaN(birth.getTime())) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  getStadeLabel(): string {
    switch (this.patient?.stade) {
      case 'LEGER':  return 'Léger';
      case 'MODERE': return 'Modéré';
      case 'SEVERE': return 'Sévère';
      default:       return 'Non défini';
    }
  }

  getStadeColor(): string {
    switch (this.patient?.stade) {
      case 'LEGER':  return 'success';
      case 'MODERE': return 'warning';
      case 'SEVERE': return 'danger';
      default:       return 'secondary';
    }
  }

  get contactUrgenceNom():      string {
    return this.patient?.contactUrgenceNom
        || (this.relation ? `${this.relation.prenom} ${this.relation.nom}` : 'Non renseigné');
  }
  get contactUrgenceTelephone():string {
    return this.patient?.contactUrgenceTelephone
        || this.relation?.telephone
        || 'Non renseigné';
  }
  get contactUrgenceRelation(): string {
    return this.patient?.contactUrgenceRelation
        || (this.relation as any)?.lienAvecPatient
        || 'Non renseigné';
  }
  get notes():   string { return this.patient?.notes   || ''; }
  get adresse(): string { return this.patient?.adresse || 'Non renseignée'; }

  // ── Infos relation ────────────────────────────────────────
  get relationNomComplet(): string {
    if (!this.relation) return 'Aucun compte relation créé';
    return `${this.relation.prenom ?? ''} ${this.relation.nom ?? ''}`.trim();
  }
  get relationEmail():    string { return this.relation?.email     || '—'; }
  get relationTelephone():string { return this.relation?.telephone || '—'; }
  get relationLien():     string { return (this.relation as any)?.lienAvecPatient || '—'; }
}