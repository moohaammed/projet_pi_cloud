import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';

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
  auth = inject(AuthService);

  getAccountLink(): string {
    const role = this.auth.getRole();
    if (role === 'DOCTOR') {
      return '/medecin-dashboard';
    } else if (role === 'PATIENT') {
      return '/patient-dashboard';
    }
    return '/';
  }
}
