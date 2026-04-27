import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { LocationHistoryItem, LocationRecognitionService } from '../../services/location-recognition.service';

@Component({
  selector: 'app-location-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-dashboard.component.html',
  styleUrl: './location-dashboard.component.css'
})
export class LocationDashboardComponent implements OnInit, OnDestroy {
  currentUser: any = {};
  patientId: number | null = null;
  current: LocationHistoryItem | null = null;
  history: LocationHistoryItem[] = [];
  errorMessage = '';
  loading = false;

  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private authService: AuthService,
    private locationService: LocationRecognitionService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    const role = this.currentUser?.role;
    if (role !== 'DOCTOR' && role !== 'RELATION') {
      this.errorMessage = 'Tableau reserve aux medecins et proches.';
      return;
    }

    const sessionPatientId = Number(this.currentUser?.patientId ?? this.currentUser?.patient_id);
    this.patientId = sessionPatientId || null;
    if (this.patientId) {
      this.startPolling();
    }
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  startPolling(): void {
    if (!this.patientId) {
      this.errorMessage = 'Saisissez un identifiant patient.';
      return;
    }

    this.errorMessage = '';
    this.loadLocation();
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.intervalId = setInterval(() => this.loadLocation(), 30000);
  }

  private loadLocation(): void {
    if (!this.patientId) {
      return;
    }

    this.loading = true;
    this.locationService.current(this.patientId).subscribe({
      next: data => {
        this.current = data;
        this.loading = false;
      },
      error: err => {
        this.errorMessage = err?.error?.message || err?.error || 'Aucune localisation recente pour ce patient.';
        this.loading = false;
      }
    });

    this.locationService.history(this.patientId).subscribe({
      next: data => {
        this.history = data;
      },
      error: () => {
        this.history = [];
      }
    });
  }

  get isUnknown(): boolean {
    return this.current?.statut === 'ZONE_INCONNUE';
  }
}
