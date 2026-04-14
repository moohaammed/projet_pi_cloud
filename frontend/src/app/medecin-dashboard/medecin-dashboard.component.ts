import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PatientService } from '../services/patient.service';
import { AnalyseService } from '../services/analyse.service';
import { PatientProgressionService } from '../services/patient-progression.service';
import { PredictionService } from '../services/prediction.service';

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

  isLoadingPatients = false;
  isLoadingAnalyses = false;
  isSavingObservation = false;
  successMessage = '';

  progressionScoreQuiz: number = 0;
  progressionStadeQuiz: string = 'LEGER';
  progressionScoreGame: number = 0;
  progressionStadeGame: string = 'LEGER';
  progressionScoreFinal: number = 0;
  progressionHistory: any[] = [];
  isLoadingProgression = false;
  isResetting = false;

  predictionData: any = {
    Age: null,
    EDUC: null,
    SES: null,
    MMSE: null,
    eTIV: null,
    nWBV: null,
    ASF: null
  };
  predictionResult: any = null;
  isPredicting = false;

  riskPredictionData: any = {
    MMSE: null,
    CDRSB: null,
    ADAS11: null,
    ADAS13: null
  };
  riskPredictionResult: any = null;
  isPredictingRisk = false;

  constructor(
    private patientService: PatientService,
    private analyseService: AnalyseService,
    private progressionService: PatientProgressionService,
    private predictionService: PredictionService
  ) { }

  ngOnInit(): void {
    this.loadPatients();
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
    this.predictionResult = null;
    this.riskPredictionResult = null;
    this.predictionData.Age = patient.age || null;
    this.isLoadingAnalyses = true;
    this.analyseService.getAnalysesByPatient(patient.id).subscribe({
      next: (data) => {
        this.analyses = data || [];
        this.isLoadingAnalyses = false;
      },
      error: () => this.isLoadingAnalyses = false
    });
    
    // Load progression
    const userId = patient.user ? patient.user.id : patient.id; // fallback if user logic differs
    if (userId) {
      this.loadProgression(userId);
    }
  }

  loadProgression(userId: number) {
    this.isLoadingProgression = true;
    this.progressionService.getScoreAndStade(userId).subscribe({
      next: (data) => {
        this.progressionScoreQuiz = data.scoreQuiz;
        this.progressionStadeQuiz = data.stadeQuiz;
        this.progressionScoreGame = data.scoreGame;
        this.progressionStadeGame = data.stadeGame;
        this.progressionScoreFinal = (this.progressionScoreQuiz + this.progressionScoreGame) / 2;
        this.predictionData.MMSE = this.progressionScoreFinal;
        this.riskPredictionData.MMSE = this.progressionScoreFinal;
      },
      error: (err) => console.error(err)
    });

    this.progressionService.getHistory(userId).subscribe({
      next: (data) => {
        this.progressionHistory = data || [];
        this.isLoadingProgression = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoadingProgression = false;
      }
    });
  }

  resetPatientProgression(type: string = 'ALL') {
    if (!this.selectedPatient || !confirm(`Êtes-vous sûr de vouloir réinitialiser la progression de ce patient pour la catégorie ${type} ?`)) return;
    
    const userId = this.selectedPatient.user ? this.selectedPatient.user.id : this.selectedPatient.id;
    this.isResetting = true;
    this.progressionService.resetPatient(userId, type).subscribe({
      next: () => {
        this.showSuccess("Progression réinitialisée avec succès.");
        this.loadProgression(userId);
        this.isResetting = false;
      },
      error: (err) => {
        console.error(err);
        this.isResetting = false;
      }
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
        this.selectPatient(this.selectedPatient); // reload analyses
        this.selectedAnalyse = null;
        this.isSavingObservation = false;
      },
      error: () => this.isSavingObservation = false
    });
  }

  predictAlzheimer() {
    this.isPredicting = true;
    this.predictionResult = null;
    this.predictionService.predict(this.predictionData).subscribe({
      next: (res: any) => {
        this.predictionResult = res;
        this.isPredicting = false;
        this.showSuccess('Prédiction terminée avec succès.');
      },
      error: (err) => {
        console.error(err);
        this.isPredicting = false;
      }
    });
  }

  predictRiskAlzheimer() {
    this.isPredictingRisk = true;
    this.riskPredictionResult = null;
    this.predictionService.predictRisk(this.riskPredictionData).subscribe({
      next: (res: any) => {
        this.riskPredictionResult = res;
        this.isPredictingRisk = false;
        this.showSuccess('Prédiction du risque terminée avec succès.');
      },
      error: (err) => {
        console.error(err);
        this.isPredictingRisk = false;
      }
    });
  }
}
