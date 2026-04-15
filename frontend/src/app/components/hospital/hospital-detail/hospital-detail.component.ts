import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Hospital } from '../../../models/hospital.model';
import { HospitalService } from '../../../services/hospital.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-hospital-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './hospital-detail.component.html'
})
export class HospitalDetailComponent implements OnInit {

  hospital: Hospital | null = null;
  loading = true;
  error = '';
  isAdmin = false;
  isDoctor = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hospitalService: HospitalService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const role = this.authService.getRole();
    this.isAdmin  = role === 'ADMIN';
    this.isDoctor = role === 'DOCTOR';

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.hospitalService.getById(+id).subscribe({
        next: (data) => {
          this.hospital = data;
          this.loading  = false;
        },
        error: () => {
          this.error   = 'Hôpital introuvable';
          this.loading = false;
        }
      });
    }
  }

  delete(): void {
    if (!this.hospital?.id) return;
    if (confirm('Supprimer cet hôpital définitivement ?')) {
      this.hospitalService.delete(this.hospital.id).subscribe({
        next: () => this.router.navigate(['/hospitals'])
      });
    }
  }

  getGoogleMapsUrl(): string {
    if (this.hospital?.latitude && this.hospital?.longitude) {
      return `https://maps.google.com/?q=${this.hospital.latitude},${this.hospital.longitude}`;
    }
    return `https://maps.google.com/?q=${this.hospital?.adresse} ${this.hospital?.ville}`;
  }

  getStars(rating: number): number[] {
    return [1, 2, 3, 4, 5];
  }
}