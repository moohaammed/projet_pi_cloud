import { Component, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'MediSync';
  navOpen = false;

  public auth = inject(AuthService);
  private router = inject(Router);

  // Admin Shell UI State
  isSidebarCollapsed = false;
  globalSearchQuery = '';

  isAuthPage(): boolean {
    return this.router.url.includes('auth/');
  }

  showAdminShell(): boolean {
    if (this.auth.getRole() === 'ADMIN' && !this.isAuthPage()) {
      return true;
    }
    return this.router.url.includes('/admin') || this.router.url.includes('/users');
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  doGlobalSearch(): void {
    console.log('Recherche globale:', this.globalSearchQuery);
    // Implémentez la logique de recherche ici
  }

  getAccountLink(): string {
    const user = this.auth.getCurrentUser();
    if (!user) return '/auth/login';
    
    const role = user.role || (user.roles && user.roles[0]);
    if (role === 'MEDECIN' || role === 'DOCTOR') {
      return '/medecin-dashboard';
    }
    if (role === 'ADMIN') {
      return '/admin/dashboard';
    }
    return '/patient-dashboard';
  }

  isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }
}
