import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {

  credentials = { email: '', password: '' };
  loading = false;
  error = '';
  showPassword = false;

  constructor(private authService: AuthService, private router: Router) {}

  login(): void {
    if (!this.credentials.email || !this.credentials.password) {
      this.error = 'Veuillez remplir tous les champs';
      return;
    }
    this.loading = true;
    this.error = '';
    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.loading = false;
        this.authService.redirectByRole();
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err.status === 0
          ? 'Serveur inaccessible'
          : (err.error?.message || err.error || 'Email ou mot de passe incorrect');
      }
    });
  }

  togglePassword(): void { this.showPassword = !this.showPassword; }
}