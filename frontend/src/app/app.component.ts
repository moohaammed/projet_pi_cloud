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
  auth = inject(AuthService);
  router = inject(Router);

  isAuthPage(): boolean {
    const url = this.router.url;
    return url.includes('auth/login') || url.includes('auth/register');
  }

  showAdminShell(): boolean {
    return this.auth.isLoggedIn() && 
           this.auth.getRole() === 'ADMIN' && 
           !this.isAuthPage();
  }

  // Global Admin Layout State
  isSidebarCollapsed = false;
  globalSearchQuery = '';

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  doGlobalSearch() {
    console.log("Global search requested for:", this.globalSearchQuery);
    // Future: Use an Event Bus or a Service to broadcast this query to the active module
  }

  getAccountLink(): string {
    const role = this.auth.getRole();
    if (role === 'ADMIN') {
      return '/admin/dashboard';
    }
    if (role === 'DOCTOR') {
      return '/medecin-dashboard';
    }
    return '/patient-dashboard';
  }

  isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }
}
