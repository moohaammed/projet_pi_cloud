import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'MediSync';
  navOpen = false;
  private authService = inject(AuthService);

  getAccountLink(): string {
    const user = this.authService.getCurrentUser();
    if (!user) return '/auth/login';
    
    // On suppose que le rôle est dans user.role ou user.roles[0]
    const role = user.role || (user.roles && user.roles[0]);
    
    if (role === 'MEDECIN' || role === 'DOCTOR') {
      return '/medecin-dashboard';
    }
    return '/patient-dashboard';
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
}
