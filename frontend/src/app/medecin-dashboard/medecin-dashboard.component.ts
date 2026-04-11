import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PatientService } from '../services/patient.service';
import { AnalyseService } from '../services/analyse.service';
import { MapService } from '../services/map.service'; // ← ajoute

@Component({
  selector: 'app-medecin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './medecin-dashboard.component.html',
  styleUrl: './medecin-dashboard.component.css'
})
export class MedecinDashboardComponent implements OnInit {
  patients: any[] = [];
  selectedPatient: any = null;
  analyses: any[] = [];
  selectedAnalyse: any = null;
  observationToAdd: string = '';
  alertesCount = 0; // ← ajoute

  isLoadingPatients = false;
  isLoadingAnalyses = false;
  isSavingObservation = false;
  successMessage = '';

  constructor(
    private patientService: PatientService,
    private analyseService: AnalyseService,
    private mapService: MapService // ← ajoute
  ) { }

  ngOnInit(): void {
    this.loadPatients();
    this.chargerAlertes(); // ← ajoute
  }

  // ← AJOUTE CETTE METHODE
  chargerAlertes(): void {
    this.mapService.getAllAlerts().subscribe({
      next: (alertes) => {
        this.alertesCount = alertes.filter((a: any) => !a.resolue).length;
      },
      error: () => {}
    });
  }

  showSuccess(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3000);
  }

  loadPatients() {
    this.isLoadingPatients = true;
    this.patientService.getAllPatients().subscribe({
      next: (data) => {
        this.patients = data || [];
        this.isLoadingPatients = false;
      },
      error: () => this.isLoadingPatients = false
    });
  }

  selectPatient(patient: any) {
    this.selectedPatient = patient;
    this.selectedAnalyse = null;
    this.isLoadingAnalyses = true;
    this.analyseService.getAnalysesByPatient(patient.id).subscribe({
      next: (data) => {
        this.analyses = data || [];
        this.isLoadingAnalyses = false;
      },
      error: () => this.isLoadingAnalyses = false
    });
  }

  get highRiskCount(): number {
    return this.analyses.filter(a => a.pourcentageRisque != null && a.pourcentageRisque > 50).length;
  }

  viewAnalyseDetails(analyse: any) {
    this.selectedAnalyse = { ...analyse };
    this.observationToAdd = analyse.observationMedicale || '';
  }

  saveObservation() {
    if (!this.selectedAnalyse) return;
    this.isSavingObservation = true;

    const payload = { ...this.selectedAnalyse, observationMedicale: this.observationToAdd };
    this.analyseService.updateAnalyse(this.selectedAnalyse.id, payload).subscribe({
      next: () => {
        this.showSuccess("Observation ajoutée avec succès.");
        this.selectPatient(this.selectedPatient);
        this.selectedAnalyse = null;
        this.isSavingObservation = false;
      },
      error: () => this.isSavingObservation = false
    });
  }
}