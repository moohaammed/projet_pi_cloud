import { Component, OnInit, OnDestroy } from '@angular/core';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PatientService } from '../services/patient.service';
import { AnalyseService } from '../services/analyse.service';
import { MapService } from '../services/map.service';
import { PatientProgressionService } from '../services/patient-progression.service';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { HttpClient } from '@angular/common/http';
import { RappelService } from '../services/rappel.service';
import { PredictionService } from '../services/prediction.service';


@Component({
  selector: 'app-medecin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './medecin-dashboard.component.html',
  styleUrl: './medecin-dashboard.component.css'
})
export class MedecinDashboardComponent implements OnInit, OnDestroy {
  evolutionChart: Chart | null = null;
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
  activeTab: string = 'analyses'; // 'analyses' or 'rappels'

  // Reminders
  reminders: any[] = [];
  isLoadingReminders = false;
  showReminderModal = false;
  reminderForm: any = {
    titre: '',
    description: '',
    heure_rappel: '',
    jours: 'TOUS',
    type: 'AUTRE',
    actif: true
  };
  selectedDays: string[] = [];
  isEditingReminder = false;
  editingReminderId: number | null = null;

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

  // MRI Tooling
  imgBrightness = 1.0;
  imgContrast = 1.0;
  imgExposure = 1.0;
  imgZoom = 1.0;
  imgInvert = false;
  panX = 0;
  panY = 0;
  isDragging = false;
  startX = 0;
  startY = 0;

  constructor(
    private patientService: PatientService,
    private analyseService: AnalyseService,
    private progressionService: PatientProgressionService,
    private authService: AuthService,
    private userService: UserService,
    private rappelService: RappelService

    private progressionService: PatientProgressionService,
    private predictionService: PredictionService,


    private mapService: MapService, // ← ajoute



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

  ngOnDestroy(): void {
    if (this.evolutionChart) this.evolutionChart.destroy();
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
        setTimeout(() => this.initEvolutionChart(), 300);
      },
      error: () => this.isLoadingAnalyses = false
    });

    // Load progression
    const userId = patient.user ? patient.user.id : patient.id; // fallback if user logic differs
    if (userId) {
      this.loadProgression(userId);
    }

    // Reset tab and load reminders
    this.activeTab = 'analyses';
    this.loadReminders(patient.id);
  }

  loadReminders(patientId: number) {
    this.isLoadingReminders = true;
    this.rappelService.getByPatient(patientId).subscribe({
      next: (data) => {
        this.reminders = data || [];
        this.isLoadingReminders = false;
      },
      error: () => this.isLoadingReminders = false
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
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
    if (analyse.observationMedicale && analyse.observationMedicale.startsWith('{')) {
      try {
        this.selectedAnalyse.geminiData = JSON.parse(analyse.observationMedicale);
        this.observationToAdd = '';
      } catch (e) {
        this.selectedAnalyse.geminiData = null;
      }
    } else {
      this.selectedAnalyse.geminiData = null;
    }
    this.resetFilters();
  }

  initEvolutionChart() {
    if (this.evolutionChart) this.evolutionChart.destroy();
    const canvas = document.getElementById('evolutionChart') as HTMLCanvasElement;
    if (!canvas) return;

    const validAnalyses = this.analyses
      .filter(a => a.date && a.pourcentageRisque != null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (validAnalyses.length === 0) return;

    setTimeout(() => {
      this.evolutionChart = new Chart(canvas, {
        type: 'line',
        data: {
          labels: validAnalyses.map(a => a.date),
          datasets: [{
            label: 'Risque Alzheimer IA (%)',
            data: validAnalyses.map(a => parseFloat(a.pourcentageRisque)),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.3,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#8b5cf6',
            pointBorderWidth: 2,
            pointRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, max: 100, grid: { color: '#e5e7eb' } },
            x: { grid: { display: false } }
          }
        }
      });
    }, 100);
  }

  // ── MRI Tooling Methods ──────────────────────────────────────────────
  get mriFilterStyle() {
    return `brightness(${this.imgBrightness * this.imgExposure}) contrast(${this.imgContrast * this.imgExposure}) ${this.imgInvert ? 'invert(1)' : ''}`;
  }

  get mriTransformStyle() {
    return `scale(${this.imgZoom}) translate(${this.panX}px, ${this.panY}px)`;
  }

  toggleInvert() {
    this.imgInvert = !this.imgInvert;
  }

  resetFilters() {
    this.imgBrightness = 1.0;
    this.imgContrast = 1.0;
    this.imgExposure = 1.0;
    this.imgZoom = 1.0;
    this.imgInvert = false;
    this.panX = 0;
    this.panY = 0;
  }

  startDrag(event: MouseEvent) {
    if (this.imgZoom <= 1.0) return;
    this.isDragging = true;
    this.startX = event.clientX - this.panX;
    this.startY = event.clientY - this.panY;
  }

  doDrag(event: MouseEvent) {
    if (!this.isDragging) return;
    event.preventDefault();
    this.panX = event.clientX - this.startX;
    this.panY = event.clientY - this.startY;
  }

  stopDrag() {
    this.isDragging = false;
  }

  downloadFilteredImage() {
    if (!this.selectedAnalyse || !this.selectedAnalyse.imageIRM) return;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = this.selectedAnalyse.imageIRM;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = `brightness(${this.imgBrightness * this.imgExposure}) contrast(${this.imgContrast * this.imgExposure}) ${this.imgInvert ? 'invert(1)' : ''}`;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `IRM_${this.selectedPatient?.nom || 'Patient'}_Filters.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      }
    };
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

  // ── Rappels Quotidiens ──────────────────────────────────────────

  openAddReminder() {
    this.isEditingReminder = false;
    this.editingReminderId = null;
    this.reminderForm = {
      titre: '',
      description: '',
      heure_rappel: '08:00',
      jours: 'TOUS',
      type: 'AUTRE',
      actif: true
    };
    this.selectedDays = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE']; // Default to all days
    this.showReminderModal = true;
  }

  openEditReminder(rappel: any) {
    this.isEditingReminder = true;
    this.editingReminderId = rappel.id;
    this.reminderForm = { ...rappel };
    if (rappel.jours === 'TOUS') {
      this.selectedDays = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];
    } else {
      this.selectedDays = rappel.jours.split(',');
    }
    this.showReminderModal = true;
  }

  toggleDay(day: string) {
    if (day === 'TOUS') {
      if (this.selectedDays.length === 7) {
        this.selectedDays = [];
      } else {
        this.selectedDays = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];
      }
    } else {
      const idx = this.selectedDays.indexOf(day);
      if (idx > -1) this.selectedDays.splice(idx, 1);
      else this.selectedDays.push(day);
    }

    if (this.selectedDays.length === 7) this.reminderForm.jours = 'TOUS';
    else this.reminderForm.jours = this.selectedDays.join(',');
  }

  saveReminder() {
    if (!this.selectedPatient) return;

    const currentUser = this.authService.getCurrentUser();
    const payload = {
      titre: this.reminderForm.titre,
      description: this.reminderForm.description,
      heureRappel: this.reminderForm.heure_rappel,
      jours: this.reminderForm.jours,
      type: this.reminderForm.type,
      actif: this.reminderForm.actif,
      patient: { id: this.selectedPatient.id },
      createdBy: { id: currentUser.id }
    };

    if (this.isEditingReminder && this.editingReminderId) {
      this.rappelService.update(this.editingReminderId, payload).subscribe({
        next: () => {
          this.showSuccess("Rappel modifié avec succès.");
          this.loadReminders(this.selectedPatient.id);
          this.showReminderModal = false;
        }
      });
    } else {
      this.rappelService.create(payload).subscribe({
        next: () => {
          this.showSuccess("Rappel ajouté avec succès.");
          this.loadReminders(this.selectedPatient.id);
          this.showReminderModal = false;
        }
      });
    }
  }

  deleteReminder(id: number) {
    if (confirm("Supprimer ce rappel ?")) {
      this.rappelService.delete(id).subscribe({
        next: () => {
          this.showSuccess("Rappel supprimé.");
          this.loadReminders(this.selectedPatient.id);
        }
      });
    }
  }

  toggleReminderActif(rappel: any) {
    this.rappelService.toggle(rappel.id).subscribe({
      next: () => {
        rappel.actif = !rappel.actif;
      }
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
