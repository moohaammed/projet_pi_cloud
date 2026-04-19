import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Hospital } from '../../../models/hospital.model';
import { HospitalService } from '../../../services/hospital.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-hospital-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './hospital-form.component.html'
})
export class HospitalFormComponent implements OnInit {

  hospital: Hospital = {
    nom: '', adresse: '', telephone: '',
    email: '', ville: '', description: '',
    siteWeb: '', rating: 0, nombreAvis: 0,
    latitude: undefined, longitude: undefined
  };

  isEdit = false;
  loading = false;
  error = '';
  isAdmin = false;
  isDoctor = false;

  constructor(
    private hospitalService: HospitalService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const role = this.authService.getRole();
    this.isAdmin  = role === 'ADMIN';
    this.isDoctor = role === 'DOCTOR';

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.hospitalService.getById(+id).subscribe({
        next: (data) => this.hospital = data
      });
    }
  }

  save(): void {
    if (!this.hospital.nom || !this.hospital.ville) {
      this.error = 'Le nom et la ville sont obligatoires';
      return;
    }
    this.loading = true;
    this.error = '';

    const action = this.isEdit
      ? this.hospitalService.update(this.hospital.id!, this.hospital)
      : this.hospitalService.create(this.hospital);

    action.subscribe({
      next: () => this.router.navigate(['/hospitals']),
      error: (err: any) => {
        this.error = err.error?.message || 'Erreur lors de l\'enregistrement';
        this.loading = false;
      }
    });
  }

  cancel(): void { this.router.navigate(['/hospitals']); }
}