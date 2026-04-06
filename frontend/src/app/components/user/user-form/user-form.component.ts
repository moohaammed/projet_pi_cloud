import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlzUserService } from '../../../services/alz-user.service';
import { User, Role } from '../../../models/user.model';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-form.component.html'
})
export class UserFormComponent implements OnInit {

  user: User = {
    nom: '', prenom: '', email: '',
    password: '', telephone: '',
    role: Role.PATIENT, actif: true
  };

  roles = Object.values(Role);
  isEdit = false;
  loading = false;
  error = '';

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
        next: (data) => this.user = data
      });
    }
  }

  save(): void {
    this.loading = true;
    const action = this.isEdit
      ? this.alzUserService.update(this.user.id!, this.user)
      : this.alzUserService.create(this.user);

    action.subscribe({
      next: () => this.router.navigate(['/users']),
      error: (err: any) => {
        this.error = err.error?.message || err.error || 'Erreur';
        this.loading = false;
      }
    });
  }

  cancel(): void { this.router.navigate(['/users']); }
}