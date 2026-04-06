import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-contact-doctor',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './contact-doctor.component.html',
  styleUrls: ['./contact-doctor.component.css']
})
export class ContactDoctorComponent implements OnInit {
  doctors: any[] = [];
  isLoading = true;

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
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch doctors', err);
        this.isLoading = false;
      }
    });
  }

  viewDoctorDetail(id: number) {
    this.router.navigate(['/doctor-detail', id]);
  }

  goBack() {
    this.router.navigate(['/patient-dashboard']);
  }
}
