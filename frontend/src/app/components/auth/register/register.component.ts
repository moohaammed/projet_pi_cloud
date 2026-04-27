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
    password: '', telephone: '', image: '', role: Role.PATIENT
  };
  confirmPassword = '';
  loading = false;
  error = '';
  showPassword = false;
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  roles = [
    { value: Role.DOCTOR,   label: 'Médecin',       icon: 'fa-user-doctor' },
    { value: Role.PATIENT,  label: 'Patient',        icon: 'fa-bed-pulse' }
  ];

  constructor(private authService: AuthService, private router: Router) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

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

    const formData = new FormData();
    formData.append('nom', this.data.nom);
    formData.append('prenom', this.data.prenom);
    formData.append('email', this.data.email);
    formData.append('password', this.data.password);
    formData.append('telephone', this.data.telephone);
    formData.append('role', this.data.role);
    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    this.authService.register(formData).subscribe({
      next: () => {
        this.loading = false;
        this.authService.redirectByRole();
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err.error?.message || err.error || 'Une erreur est survenue';
      }
    });
  }

  selectRole(role: Role): void { this.data.role = role; }
  togglePassword(): void { this.showPassword = !this.showPassword; }
}
