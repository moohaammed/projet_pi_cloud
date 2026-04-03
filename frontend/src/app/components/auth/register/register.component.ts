import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { Role } from '../../../models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent {

  data = {
    nom: '', prenom: '', email: '',
    password: '', telephone: '', role: Role.PATIENT
  };
  confirmPassword = '';
  loading = false;
  error = '';
  showPassword = false;

  roles = [
    { value: Role.DOCTOR,   label: 'Médecin',       icon: 'fa-user-doctor' },
    { value: Role.PATIENT,  label: 'Patient',        icon: 'fa-bed-pulse' },
    { value: Role.RELATION, label: 'Famille/Proche', icon: 'fa-people-group' }
  ];

  constructor(private authService: AuthService, private router: Router) {}

  register(): void {
    if (!this.data.nom || !this.data.email || !this.data.password) {
      this.error = 'Veuillez remplir tous les champs';
      return;
    }
    if (this.data.password !== this.confirmPassword) {
      this.error = 'Les mots de passe ne correspondent pas';
      return;
    }
    this.loading = true;
    this.error = '';
    this.authService.register(this.data).subscribe({
      next: () => {
        this.loading = false;
        this.authService.redirectByRole();
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err.error || 'Une erreur est survenue';
      }
    });
  }

  selectRole(role: Role): void { this.data.role = role; }
  togglePassword(): void { this.showPassword = !this.showPassword; }
}