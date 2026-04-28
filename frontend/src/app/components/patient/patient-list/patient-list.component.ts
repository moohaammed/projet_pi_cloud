import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AlzUserService } from '../../../services/alz-user.service';
import { AuthService } from '../../../services/auth.service';
import { HeartRateAccessService, MonitoredPatient } from '../../../services/heart-rate-access.service';
import { User, Role } from '../../../models/user.model';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './patient-list.component.html'
})
export class PatientListComponent implements OnInit {

  patients: User[] = [];
  filtered: User[] = [];
  loading = false;
  search = '';
  isAdmin = false;
  isDoctor = false;

  constructor(
    private alzUserService: AlzUserService,
    private authService: AuthService,
    private heartRateAccessService: HeartRateAccessService
  ) {}

  ngOnInit(): void {
    const role = this.authService.getRole();
    this.isAdmin  = role === 'ADMIN';
    this.isDoctor = role === 'DOCTOR';
    this.load();
  }

  load(): void {
    this.loading = true;
    if (this.isDoctor) {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser?.id) {
        this.patients = [];
        this.filtered = [];
        this.loading = false;
        return;
      }

      this.heartRateAccessService.getDoctorPatients(currentUser.id).subscribe({
        next: (data) => {
          this.patients = (data || []).map(patient => this.toUser(patient));
          this.filtered = this.patients;
          this.loading = false;
        },
        error: () => this.loading = false
      });
      return;
    }

    this.alzUserService.getByRole(Role.PATIENT).subscribe({
      next: (data) => {
        this.patients = data;
        this.filtered = data;
        this.loading  = false;
      },
      error: () => this.loading = false
    });
  }

  private toUser(patient: MonitoredPatient): User {
    return {
      id: patient.userId ?? undefined,
      nom: patient.nom || '',
      prenom: patient.prenom || '',
      email: '',
      role: Role.PATIENT,
      actif: true
    };
  }

  onSearch(): void {
    const q = this.search.toLowerCase();
    this.filtered = this.patients.filter(p =>
      p.nom.toLowerCase().includes(q) ||
      p.prenom.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  }

  toggleActif(id: number): void {
    this.alzUserService.toggleActif(id).subscribe({
      next: () => this.load()
    });
  }

  delete(id: number): void {
    if (confirm('Supprimer ce patient ?')) {
      this.alzUserService.delete(id).subscribe({
        next: () => this.load()
      });
    }
  }
}
