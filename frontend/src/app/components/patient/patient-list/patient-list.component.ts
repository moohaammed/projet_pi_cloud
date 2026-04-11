import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AlzUserService } from '../../../services/alz-user.service';
import { AuthService } from '../../../services/auth.service';
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
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const role = this.authService.getRole();
    this.isAdmin  = role === 'ADMIN';
    this.isDoctor = role === 'DOCTOR';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.alzUserService.getByRole(Role.PATIENT).subscribe({
      next: (data) => {
        this.patients = data;
        this.filtered = data;
        this.loading  = false;
      },
      error: () => this.loading = false
    });
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