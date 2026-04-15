import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlzUserService } from '../../../services/alz-user.service';
import { User, Role } from '../../../models/user.model';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './patient-form.component.html'
})
export class PatientFormComponent implements OnInit {

  patient: any = {
    nom: '', prenom: '', email: '',
    password: '', telephone: '',
    role: Role.PATIENT, actif: true,
    stade: 'LEGER',
    dateNaissance: '',
    adresse: '',
    contactUrgenceNom: '',
    contactUrgenceTelephone: '',
    contactUrgenceRelation: '',
    notes: ''
  };

  isEdit = false;
  loading = false;
  error = '';

  stades = [
    { value: 'LEGER',  label: 'Léger',   color: 'success' },
    { value: 'MODERE', label: 'Modéré',  color: 'warning' },
    { value: 'SEVERE', label: 'Sévère',  color: 'danger'  }
  ];

  constructor(
    private alzUserService: AlzUserService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.alzUserService.getById(+id).subscribe({
        next: (data) => this.patient = { ...data }
      });
    }
  }

  save(): void {
    if (!this.patient.nom || !this.patient.prenom || !this.patient.email) {
      this.error = 'Nom, prénom et email sont obligatoires';
      return;
    }
    this.loading = true;
    this.error = '';

    const action = this.isEdit
      ? this.alzUserService.update(this.patient.id, this.patient)
      : this.alzUserService.create(this.patient);

    action.subscribe({
      next: () => this.router.navigate(['/patient-profiles']),
      error: (err: any) => {
        this.error = err.error?.message || 'Erreur';
        this.loading = false;
      }
    });
  }

  cancel(): void { this.router.navigate(['/patient-profiles']); }
}