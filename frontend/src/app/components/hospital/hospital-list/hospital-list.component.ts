import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Hospital } from '../../../models/hospital.model';
import { HospitalService } from '../../../services/hospital.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-hospital-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './hospital-list.component.html'
})
export class HospitalListComponent implements OnInit {

  hospitals: Hospital[] = [];
  filtered: Hospital[] = [];
  loading = false;
  search = '';
  isAdmin = false;
  isDoctor = false;   // ← ajoute

  constructor(
    private hospitalService: HospitalService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const role = this.authService.getRole();
    this.isAdmin  = role === 'ADMIN';
    this.isDoctor = role === 'DOCTOR';   // ← ajoute
    this.load();
  }

  load(): void {
    this.loading = true;
    this.hospitalService.getAll().subscribe({
      next: (data) => {
        this.hospitals = data;
        this.filtered  = data;
        this.loading   = false;
      },
      error: () => this.loading = false
    });
  }

  onSearch(): void {
    this.filtered = this.hospitals.filter(h =>
      h.nom.toLowerCase().includes(this.search.toLowerCase()) ||
      h.ville.toLowerCase().includes(this.search.toLowerCase())
    );
  }

  delete(id: number): void {
    if (confirm('Supprimer cet hôpital ?')) {
      this.hospitalService.delete(id).subscribe({
        next: () => this.load()
      });
    }
  }
}