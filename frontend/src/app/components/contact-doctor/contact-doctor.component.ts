import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-contact-doctor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './contact-doctor.component.html',
  styleUrls: ['./contact-doctor.component.css']
})
export class ContactDoctorComponent implements OnInit {
  doctors: any[] = [];
  filteredDoctors: any[] = [];
  isLoading = true;
  searchQuery = '';
  favoriteDoctors = new Set<number>();

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchDoctors();
  }

  fetchDoctors() {
    this.userService.getByRole('DOCTOR').subscribe({
      next: (data) => {
        this.doctors = data || [];
        this.filteredDoctors = [...this.doctors];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch doctors', err);
        this.isLoading = false;
      }
    });
  }

  filterDoctors() {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredDoctors = [...this.doctors];
      return;
    }
    this.filteredDoctors = this.doctors.filter(doc =>
      (doc.firstName || '').toLowerCase().includes(q) ||
      (doc.lastName || '').toLowerCase().includes(q) ||
      (doc.specialite || '').toLowerCase().includes(q) ||
      (doc.email || '').toLowerCase().includes(q)
    );
  }

  getAvatarUrl(doc: any): string {
    if (doc.profileImageUrl) return doc.profileImageUrl;
    const fn = encodeURIComponent((doc.firstName || 'D').charAt(0));
    const ln = encodeURIComponent((doc.lastName || 'r').charAt(0));
    return `https://ui-avatars.com/api/?name=${fn}+${ln}&background=8b5cf6&color=fff&size=128&bold=true`;
  }

  toggleFavorite(id: number) {
    if (this.favoriteDoctors.has(id)) {
      this.favoriteDoctors.delete(id);
    } else {
      this.favoriteDoctors.add(id);
    }
  }

  viewDoctorDetail(id: number) {
    this.router.navigate(['/doctor-detail', id]);
  }

  goBack() {
    this.router.navigate(['/patient-dashboard']);
  }
}
