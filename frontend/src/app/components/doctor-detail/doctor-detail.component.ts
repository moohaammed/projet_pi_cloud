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

  makeAppointment() {
    this.router.navigate(['/rendezvous']);
  }

  goBack() {
    this.router.navigate(['/contact-doctor']);
  }
}
