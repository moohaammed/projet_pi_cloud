import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapService } from '../../../services/map.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-alert-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert-dashboard.component.html',
  styleUrl: './alert-dashboard.component.css'
})
export class AlertDashboardComponent implements OnInit {

  alertes: any[] = [];
  currentUser: any = {};

  constructor(
    private mapService: MapService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.chargerAlertes();
    // Rafraîchit toutes les 30 secondes
    setInterval(() => this.chargerAlertes(), 30000);
  }

  chargerAlertes(): void {
    this.mapService.getAllAlerts().subscribe({
      next: (data) => {
        this.alertes = data.sort((a: any, b: any) =>
          new Date(b.declencheeAt).getTime() - new Date(a.declencheeAt).getTime()
        );
      },
      error: (err) => console.error('Erreur chargement alertes:', err)
    });
  }

  confirmerVu(alerte: any): void {
    this.mapService.resolveAlert(alerte.id).subscribe({
      next: () => {
        alerte.resolue = true;
        console.log('✅ Alerte confirmée');
      },
      error: (err) => console.error('Erreur confirmation:', err)
    });
  }

  ouvrirGPS(alerte: any): void {
    if (alerte.latitude && alerte.longitude) {
      window.open(
        `https://www.google.com/maps?q=${alerte.latitude},${alerte.longitude}`,
        '_blank'
      );
    }
  }

  get alertesNonResolues(): any[] {
    return this.alertes.filter(a => !a.resolue);
  }

  get alertesResolues(): any[] {
    return this.alertes.filter(a => a.resolue);
  }

  getBadgeClass(type: string): string {
    switch(type) {
      case 'SOS': return 'badge bg-danger';
      case 'HORS_ZONE_ROUGE': return 'badge bg-warning';
      case 'HORS_ZONE_VERTE': return 'badge bg-info';
      case 'BATTERIE_FAIBLE': return 'badge bg-secondary';
      default: return 'badge bg-primary';
    }
  }
}