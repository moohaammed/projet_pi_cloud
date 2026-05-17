import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Hospital } from '../../../models/hospital.model';
import { HospitalService } from '../../../services/hospital.service';
import { AuthService } from '../../../services/auth.service';
import { MapService } from '../../../services/map.service';
import { PatientService } from '../../../services/patient.service';
import { AlzUserService } from '../../../services/alz-user.service';
import {
  HospitalPrediction,
  HospitalPredictionService,
  RecommendedHospital
} from '../../../services/hospital-prediction.service';

@Component({
  selector: 'app-hospital-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './hospital-list.component.html'
})
export class HospitalListComponent implements OnInit {

  hospitals: Hospital[] = [];
  filtered: Hospital[] = [];
  loading = false;
  search = '';
  isAdmin = false;
  isDoctor = false;
  isPatient = false;
  isRelation = false;

  patientId: number | null = null;
  patientPrediction: HospitalPrediction | null = null;
  patientLatitude: number | null = null;
  patientLongitude: number | null = null;
  recommendedHospitals: RecommendedHospital[] = [];
  filteredRecommendedHospitals: RecommendedHospital[] = [];
  patientLocationError = '';
  searchLoading = false;
  searchError = '';
  searchAttempted = false;

  constructor(
    private hospitalService: HospitalService,
    private authService: AuthService,
    private mapService: MapService,
    private patientService: PatientService,
    private alzUserService: AlzUserService,
    private hospitalPredictionService: HospitalPredictionService
  ) {}

  ngOnInit(): void {
    const role = this.authService.getRole();
    this.isAdmin = role === 'ADMIN';
    this.isDoctor = role === 'DOCTOR';
    this.isPatient = role === 'PATIENT';
    this.isRelation = role === 'RELATION';

    if (this.isAdmin) {
      this.loadDatasetHospitalsForAdmin();
    } else if (this.isPatient) {
      this.loadNearestHospitalsForPatient();
    } else if (this.isRelation) {
      this.loadNearestHospitalsForRelation();
    } else {
      this.load();
    }
  }

  load(): void {
    this.loading = true;
    this.hospitalService.getAll().subscribe({
      next: (data) => {
        this.hospitals = data;
        this.filtered = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  onSearch(): void {
    const term = this.search.toLowerCase().trim();

    if (this.isAiHospitalView) {
      if (!term) {
        this.filteredRecommendedHospitals = this.recommendedHospitals;
        this.searchError = '';
        this.searchAttempted = false;
        return;
      }

      if (term.length < 2) {
        this.filteredRecommendedHospitals = this.recommendedHospitals;
        this.searchError = '';
        this.searchAttempted = false;
        return;
      }

      this.searchDataset(term);
      return;
    }

    this.filtered = this.hospitals.filter(h =>
      h.nom.toLowerCase().includes(term) ||
      h.ville.toLowerCase().includes(term)
    );
  }

  searchDataset(term: string = this.search.toLowerCase().trim()): void {
    if (!this.isAiHospitalView) return;

    if (!term) {
      this.clearSearch();
      return;
    }

    if (term.length < 2) {
      this.searchError = 'Type at least 2 characters to search the dataset.';
      return;
    }

      this.loading = false;
      this.searchLoading = true;
      this.searchError = '';
      this.searchAttempted = true;

      this.hospitalPredictionService
        .searchDataset(
          term,
          this.patientLatitude ?? undefined,
          this.patientLongitude ?? undefined,
          this.isAdmin ? 0 : 3
        )
        .subscribe({
          next: (hospitals) => {
            this.filteredRecommendedHospitals = this.isAdmin ? (hospitals || []) : (hospitals || []).slice(0, 3);
            this.patientLocationError = '';
            this.searchLoading = false;
          },
          error: () => {
            this.filteredRecommendedHospitals = this.recommendedHospitals.filter(h =>
              h.nom.toLowerCase().includes(term) ||
              h.gouvernorat.toLowerCase().includes(term) ||
              h.specialite.toLowerCase().includes(term) ||
              h.adresse.toLowerCase().includes(term)
            );
            this.searchError = 'Dataset search is temporarily unavailable.';
            this.searchLoading = false;
          }
        });
  }

  clearSearch(): void {
    this.search = '';
    this.searchError = '';
    this.searchAttempted = false;
    this.filteredRecommendedHospitals = this.recommendedHospitals;
  }

  loadDatasetHospitalsForAdmin(): void {
    this.loading = true;
    this.patientLocationError = '';
    this.hospitalPredictionService.searchDataset('', undefined, undefined, 0).subscribe({
      next: (hospitals) => {
        this.recommendedHospitals = hospitals || [];
        this.filteredRecommendedHospitals = this.recommendedHospitals;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.patientLocationError = 'Failed to load hospitals from the dataset.';
      }
    });
  }

  loadNearestHospitalsForPatient(): void {
    this.loading = true;
    this.patientLocationError = '';
    const user = this.authService.getCurrentUser();
    const userId = Number(user?.patientId || user?.userId || user?.id);

    if (!userId) {
      this.loading = false;
      this.patientLocationError = 'Failed to find patient account.';
      return;
    }

    this.patientService.getPatientByUserId(userId).subscribe({
      next: (patient) => {
        this.patientId = Number(patient?.id || userId);
        this.loadPredictionFromLastLocation(this.patientId);
      },
      error: () => {
        this.patientId = userId;
        this.loadPredictionFromLastLocation(userId);
      }
    });
  }

  loadNearestHospitalsForRelation(): void {
    this.loading = true;
    this.patientLocationError = '';
    const user = this.authService.getCurrentUser();
    const relationId = Number(user?.userId || user?.id);
    const fallbackPatientId = Number(user?.patientId);

    if (!relationId && !fallbackPatientId) {
      this.loading = false;
      this.patientLocationError = 'Failed to find the patient linked to this relation.';
      return;
    }

    if (fallbackPatientId) {
      this.patientId = fallbackPatientId;
      this.loadRelationPatientLocation(fallbackPatientId);
      return;
    }

    this.alzUserService.getLinkedPatient(relationId).subscribe({
      next: (patient) => {
        this.patientId = Number(patient?.id);
        if (!this.patientId) {
          this.loading = false;
          this.patientLocationError = 'No patient linked to this relation.';
          return;
        }
        this.loadRelationPatientLocation(this.patientId);
      },
      error: () => {
        this.loading = false;
        this.patientLocationError = 'Failed to load patient linked to this relation.';
      }
    });
  }

  private loadRelationPatientLocation(patientId: number): void {
    this.mapService.getLastLocation(patientId).subscribe({
      next: (loc) => this.loadDatasetHospitals(patientId, loc.latitude, loc.longitude),
      error: () => {
        this.loading = false;
        this.patientLocationError = 'No recent location found for this patient.';
      }
    });
  }

  private loadPredictionFromLastLocation(patientId: number): void {
    this.mapService.getLastLocation(patientId).subscribe({
      next: (loc) => this.loadDatasetHospitals(patientId, loc.latitude, loc.longitude),
      error: () => this.useBrowserLocation(patientId)
    });
  }

  private useBrowserLocation(patientId: number): void {
    if (!navigator.geolocation) {
      this.loading = false;
      this.patientLocationError = 'GPS location unavailable. Please enable location services to find nearest hospitals.';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.loadDatasetHospitals(
          patientId,
          position.coords.latitude,
          position.coords.longitude
        );
      },
      () => {
        this.loading = false;
        this.patientLocationError = 'Failed to retrieve your position. Please enable location services and try again.';
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }

  private predictHospitals(patientId: number, latitude: number, longitude: number): void {
    this.patientLatitude = latitude;
    this.patientLongitude = longitude;

    this.hospitalPredictionService.predict({
      patientId,
      patientLatitude: latitude,
      patientLongitude: longitude,
      typeIncident: 'malaise'
    }).subscribe({
      next: (prediction) => {
        this.patientPrediction = prediction;
        this.recommendedHospitals = prediction.hopitaux || [];
        this.filteredRecommendedHospitals = this.recommendedHospitals;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.patientLocationError = 'Failed to load nearest hospitals.';
      }
    });
  }

  private loadDatasetHospitals(patientId: number, latitude: number, longitude: number): void {
    this.patientLatitude = latitude;
    this.patientLongitude = longitude;

    this.hospitalPredictionService.searchDataset('', latitude, longitude).subscribe({
      next: (hospitals) => {
        this.patientPrediction = {
          patientId,
          patientLatitude: latitude,
          patientLongitude: longitude,
          typeIncident: 'dataset',
          hopitaux: (hospitals || []).slice(0, 3)
        };
        this.recommendedHospitals = (hospitals || []).slice(0, 3);
        this.filteredRecommendedHospitals = this.recommendedHospitals;
        this.patientLocationError = '';
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.patientLocationError = 'Failed to load hospitals from the dataset.';
      }
    });
  }

  distance(hospital: RecommendedHospital): string {
    return hospital.distanceKm || hospital.distance_km || '';
  }

  get hasPatientSearch(): boolean {
    return this.search.trim().length > 0;
  }

  get isAiHospitalView(): boolean {
    return this.isAdmin || this.isPatient || this.isRelation;
  }

  mapsUrl(hospital: RecommendedHospital): string {
    const destination = `${hospital.latitude},${hospital.longitude}`;

    if (this.patientLatitude === null || this.patientLongitude === null) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
    }

    const origin = `${this.patientLatitude},${this.patientLongitude}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  }

  delete(id: number): void {
    if (confirm('Are you sure you want to delete this hospital?')) {
      this.hospitalService.delete(id).subscribe({
        next: () => this.load()
      });
    }
  }
}
