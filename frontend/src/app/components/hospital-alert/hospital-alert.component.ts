import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HospitalPrediction, HospitalPredictionService, RecommendedHospital } from '../../services/hospital-prediction.service';
import { PatientService } from '../../services/patient.service';

@Component({
  selector: 'app-hospital-alert',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './hospital-alert.component.html',
  styleUrl: './hospital-alert.component.css'
})
export class HospitalAlertComponent implements OnInit, OnDestroy {
  currentUser: any = {};
  predictions: HospitalPrediction[] = [];
  patientNames: Record<number, string> = {};
  addresses: Record<string, string> = {};
  loading = true;
  error = '';
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private authService: AuthService,
    private hospitalPredictionService: HospitalPredictionService,
    private patientService: PatientService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!['DOCTOR', 'RELATION'].includes(this.currentUser?.role)) {
      this.error = 'Cette page est reservee aux medecins et proches.';
      this.loading = false;
      return;
    }
    this.loadAlerts();
    this.intervalId = setInterval(() => this.loadAlerts(), 30000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private loadAlerts(): void {
    this.hospitalPredictionService.latest().subscribe({
      next: (data) => {
        this.predictions = data || [];
        this.loadPatientNames();
        this.loadAddresses();
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger les recommandations hospitalieres.';
        this.loading = false;
      }
    });
  }

  private loadPatientNames(): void {
    this.patientService.getAllPatients().subscribe({
      next: (patients) => {
        this.patientNames = {};
        (patients || []).forEach((patient: any) => {
          const label = `${patient.nom || ''} ${patient.prenom || ''}`.trim();
          if (patient.id && label) this.patientNames[patient.id] = label;
          if (patient.user?.id && label) this.patientNames[patient.user.id] = label;
        });
      },
      error: () => {}
    });
  }

  private loadAddresses(): void {
    const missing = this.predictions.filter((prediction) => {
      const key = this.positionKey(prediction);
      return key && !this.addresses[key];
    });

    if (missing.length === 0) return;

    Promise.all(
      missing.map((prediction) => {
        const key = this.positionKey(prediction);
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${prediction.patientLatitude}&lon=${prediction.patientLongitude}&zoom=18&addressdetails=1`;
        return fetch(url)
          .then((response) => response.ok ? response.json() : null)
          .then((result) => ({ key, address: result?.display_name || 'Adresse indisponible' }))
          .catch(() => ({ key, address: 'Adresse indisponible' }));
      })
    ).then((items) => {
      const nextAddresses = { ...this.addresses };
      items.forEach((item) => {
        if (item?.key) {
          nextAddresses[item.key] = item.address;
        }
      });
      this.addresses = nextAddresses;
    });
  }

  patientLabel(prediction: HospitalPrediction): string {
    if (prediction.patientName) return prediction.patientName;
    if (prediction.patientId && this.patientNames[prediction.patientId]) return this.patientNames[prediction.patientId];
    return 'Patient';
  }

  positionLabel(prediction: HospitalPrediction): string {
    const key = this.positionKey(prediction);
    return key ? (this.addresses[key] || 'Recherche de l adresse...') : 'Adresse indisponible';
  }

  private positionKey(prediction: HospitalPrediction): string {
    if (prediction.patientLatitude == null || prediction.patientLongitude == null) return '';
    return `${prediction.patientLatitude.toFixed(6)},${prediction.patientLongitude.toFixed(6)}`;
  }

  distance(hospital: RecommendedHospital): string {
    return hospital.distanceKm || hospital.distance_km || '';
  }

  mapsUrl(prediction: HospitalPrediction, hospital: RecommendedHospital): string {
    return `https://www.google.com/maps/dir/?api=1&origin=${prediction.patientLatitude},${prediction.patientLongitude}&destination=${hospital.latitude},${hospital.longitude}`;
  }
}
