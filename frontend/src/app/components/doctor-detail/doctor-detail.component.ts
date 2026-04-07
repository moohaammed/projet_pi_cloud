import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-doctor-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './doctor-detail.component.html',
  styleUrls: ['./doctor-detail.component.css']
})
export class DoctorDetailComponent implements OnInit {
  doctor: any = null;
  isLoading = true;
  isFavorite = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      if (idStr) {
        this.fetchDoctorDetail(parseInt(idStr, 10));
      } else {
        this.goBack();
      }
    });
  }

  fetchDoctorDetail(id: number) {
    this.userService.getById(id).subscribe({
      next: (data) => {
        this.doctor = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Doctor not found', err);
        this.isLoading = false;
      }
    });
  }

  /**
   * Returns a null-safe hero banner image URL.
   * Uses ui-avatars as a beautiful fallback (no template event binding needed).
   */
  getHeroImage(): string {
    if (this.doctor?.profileImageUrl) {
      return this.doctor.profileImageUrl;
    }
    const fn = encodeURIComponent((this.doctor?.firstName || 'D').charAt(0));
    const ln = encodeURIComponent((this.doctor?.lastName || 'r').charAt(0));
    // Large, high-quality generated avatar for the banner
    return `https://ui-avatars.com/api/?name=${fn}+${ln}&background=8b5cf6&color=fff&size=512&bold=true&font-size=0.4`;
  }

  toggleFav() {
    this.isFavorite = !this.isFavorite;
  }

  makeAppointment() {
    this.router.navigate(['/rendezvous']);
  }

  goBack() {
    this.router.navigate(['/contact-doctor']);
  }
}
