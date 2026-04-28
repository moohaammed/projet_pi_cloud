import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { PatientService } from '../services/patient.service';
import { AnalyseService } from '../services/analyse.service';
import { MapService } from '../services/map.service';
import { PatientProgressionService } from '../services/patient-progression.service';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { RappelService } from '../services/rappel.service';
import { PredictionService } from '../services/prediction.service';
import { HeartRateAccessService, MonitoredPatient } from '../services/heart-rate-access.service';
import { HeartRateService, HeartRateRecord } from '../services/heart-rate.service';
import { HeartRateAiService, HeartRateAiResult } from '../services/heart-rate-ai.service';


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
  alertesCount = 0;

  isLoadingPatients = false;
  isLoadingAnalyses = false;
  isSavingObservation = false;
  successMessage = '';
  activeTab: string = 'analyses';

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

  // --- Heart Rate Monitoring ---
  heartRateStatus: 'connected' | 'disconnected' = 'disconnected';
  currentBpm: number | null = null;
  deviceName: string = '—';
  lastRecordedAt: string = '';
  bpmHistory: number[] = [];
  history: HeartRateRecord[] = [];
  aiStatus: string = 'idle';
  aiResult: HeartRateAiResult | null = null;

  private heartRateSseSubscription: Subscription | null = null;
  private aiSseSubscription: Subscription | null = null;
  private heartRateInactivityInterval: ReturnType<typeof setInterval> | null = null;
  private heartRateReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastHeartRateEventTimestamp: number = 0;
  private readonly HEART_RATE_INACTIVITY_MS = 5000;

  // --- Voice Recording ---
  mediaRecorder: any;
  audioChunks: any[] = [];
  isRecording = false;
  recordedBlob: Blob | null = null;
  recordedAudioUrl: string | null = null;
  isUploadingVoice = false;
  recordingTimer: number = 0;
  timerInterval: any;

  constructor(
    private patientService: PatientService,
    private analyseService: AnalyseService,
    private progressionService: PatientProgressionService,
    private authService: AuthService,
    private userService: UserService,
    private rappelService: RappelService,
    private predictionService: PredictionService,
    private mapService: MapService,
    private heartRateAccessService: HeartRateAccessService,
    private heartRateService: HeartRateService,
    private heartRateAiService: HeartRateAiService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadPatients();
    this.chargerAlertes();
  }

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
    this.stopHeartRateMonitoring();
  }

  showSuccess(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3000);
  }

  loadPatients() {
    this.isLoadingPatients = true;
    const currentUser = this.authService.getCurrentUser();
    const patientsRequest = currentUser?.id
      ? this.heartRateAccessService.getDoctorPatients(currentUser.id)
      : this.patientService.getAllPatients();

    patientsRequest.subscribe({
      next: (data) => {
        this.patients = (data || []).map((patient: any) => this.normalizePatient(patient));
        this.isLoadingPatients = false;
      },
      error: () => this.isLoadingPatients = false
    });
  }

  private normalizePatient(patient: any): any {
    if (patient.patientId) {
      const monitoredPatient = patient as MonitoredPatient;
      return {
        id: monitoredPatient.patientId,
        nom: monitoredPatient.nom,
        prenom: monitoredPatient.prenom,
        age: monitoredPatient.age,
        poids: monitoredPatient.poids,
        sexe: monitoredPatient.sexe,
        user: monitoredPatient.userId ? { id: monitoredPatient.userId } : null
      };
    }
    return patient;
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

    const userId = patient.user ? patient.user.id : patient.id;
    if (userId) {
      this.loadProgression(userId);
    }

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

  setTab(tab: string): void {
    if (this.activeTab === 'monitoring' && tab !== 'monitoring') {
      this.stopHeartRateMonitoring();
    }
    this.activeTab = tab;
    if (tab === 'monitoring') {
      this.initHeartRateMonitoring();
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

    if (analyse.observationMedicale && analyse.observationMedicale.startsWith('{')) {
      try {
        this.selectedAnalyse.geminiData = JSON.parse(analyse.observationMedicale);
        this.observationToAdd = '';
      } catch {
        this.selectedAnalyse.geminiData = null;
      }
    } else {
      this.selectedAnalyse.geminiData = null;
    }

    this.resetFilters();
  }

  saveObservation() {
    if (!this.selectedAnalyse || !this.observationToAdd) return;
    this.isSavingObservation = true;
    
    const updated = {
      ...this.selectedAnalyse,
      observationMedicale: this.observationToAdd
    };
    
    this.analyseService.updateAnalyse(this.selectedAnalyse.id, updated).subscribe({
      next: () => {
        this.selectedAnalyse.observationMedicale = this.observationToAdd;
        this.showSuccess("Observation médicale enregistrée.");
        this.isSavingObservation = false;
        const idx = this.analyses.findIndex(a => a.id === this.selectedAnalyse.id);
        if (idx !== -1) this.analyses[idx].observationMedicale = this.observationToAdd;
      },
      error: () => this.isSavingObservation = false
    });
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

  // --- Reminders ---
  openAddReminder() {
    this.isEditingReminder = false;
    this.editingReminderId = null;
    this.reminderForm = { title: '', description: '', heure_rappel: '', jours: 'TOUS', type: 'AUTRE', actif: true };
    this.selectedDays = ['TOUS'];
    this.showReminderModal = true;
  }

  openEditReminder(rappel: any) {
    this.isEditingReminder = true;
    this.editingReminderId = rappel.id;
    this.reminderForm = {
      titre: rappel.titre,
      description: rappel.description,
      heure_rappel: rappel.heureRappel,
      type: rappel.type,
      actif: rappel.actif
    };
    this.selectedDays = rappel.jours.split(',');
    this.showReminderModal = true;
  }

  saveReminder() {
    if (!this.selectedPatient) return;
    const payload = {
      ...this.reminderForm,
      heureRappel: this.reminderForm.heure_rappel,
      jours: this.selectedDays.includes('TOUS') ? 'TOUS' : this.selectedDays.join(','),
      patient: { id: this.selectedPatient.id }
    };

    const action = this.isEditingReminder && this.editingReminderId ? 
      this.rappelService.update(this.editingReminderId, payload) : 
      this.rappelService.create(payload);

    action.subscribe({
      next: (res: any) => {
        this.showSuccess(this.isEditingReminder ? "Rappel mis à jour." : "Nouveau rappel créé.");
        
        // If we have a recorded voice, upload it now
        if (this.recordedBlob && res.id) {
          this.uploadVoice(res.id);
        } else {
          this.showReminderModal = false;
          this.loadReminders(this.selectedPatient.id);
        }
      }
    });
  }

  // --- Voice Recording Logic ---
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.recordedBlob = null;
      this.recordedAudioUrl = null;

      this.mediaRecorder.ondataavailable = (event: any) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        this.recordedBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.recordedAudioUrl = URL.createObjectURL(this.recordedBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.recordingTimer = 0;
      this.timerInterval = setInterval(() => this.recordingTimer++, 1000);
    } catch (err) {
      alert("Veuillez autoriser l'accès au microphone.");
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      clearInterval(this.timerInterval);
    }
  }

  deleteRecording() {
    this.recordedBlob = null;
    this.recordedAudioUrl = null;
    this.audioChunks = [];
    this.recordingTimer = 0;
  }

  uploadVoice(rappelId: number) {
    if (!this.recordedBlob) return;
    this.isUploadingVoice = true;
    this.rappelService.uploadVoice(rappelId, this.recordedBlob).subscribe({
      next: () => {
        this.showSuccess("Message vocal enregistré avec succès.");
        this.isUploadingVoice = false;
        this.recordedBlob = null;
        this.recordedAudioUrl = null;
        this.showReminderModal = false;
        this.loadReminders(this.selectedPatient.id);
      },
      error: () => {
        this.isUploadingVoice = false;
        alert("Erreur lors de l'envoi du message vocal.");
      }
    });
  }

  formatTimer(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getExistingVoiceUrl(rappel: any): string | null {
    return rappel.voiceMessagePath ? this.rappelService.getVoiceUrl(rappel.id) : null;
  }

  deleteReminder(id: number) {
    if (!confirm("Supprimer ce rappel ?")) return;
    this.rappelService.delete(id).subscribe({
      next: () => {
        this.showSuccess("Rappel supprimé.");
        this.loadReminders(this.selectedPatient.id);
      }
    });
  }

  toggleReminderActif(rappel: any) {
    this.rappelService.toggle(rappel.id).subscribe({
      next: () => {
        rappel.actif = !rappel.actif;
        this.showSuccess(rappel.actif ? "Rappel activé." : "Rappel désactivé.");
      }
    });
  }

  toggleDay(day: string) {
    if (day === 'TOUS') {
      this.selectedDays = ['TOUS'];
    } else {
      if (this.selectedDays.includes('TOUS')) this.selectedDays = [];
      const idx = this.selectedDays.indexOf(day);
      if (idx > -1) this.selectedDays.splice(idx, 1);
      else this.selectedDays.push(day);
      if (this.selectedDays.length === 0 || this.selectedDays.length === 7) this.selectedDays = ['TOUS'];
    }
  }

  // --- IA ---
  predictAlzheimer() {
    if (!this.selectedPatient) return;
    this.isPredicting = true;
    this.predictionService.predict(this.predictionData).subscribe({
      next: (res) => { this.predictionResult = res; this.isPredicting = false; },
      error: () => this.isPredicting = false
    });
  }

  predictRiskAlzheimer() {
    if (!this.selectedPatient) return;
    this.isPredictingRisk = true;
    this.predictionService.predictRisk(this.riskPredictionData).subscribe({
      next: (res) => { this.riskPredictionResult = res; this.isPredictingRisk = false; },
      error: () => this.isPredictingRisk = false
    });
  }

  // --- MRI Tools ---
  resetFilters() {
    this.imgBrightness = 1.0; this.imgContrast = 1.0; this.imgExposure = 1.0;
    this.imgZoom = 1.0; this.imgInvert = false; this.panX = 0; this.panY = 0;
  }

  toggleInvert() { this.imgInvert = !this.imgInvert; }

  get mriFilterStyle() {
    return `brightness(${this.imgBrightness}) contrast(${this.imgContrast}) brightness(${this.imgExposure}) ${this.imgInvert ? 'invert(1)' : ''}`;
  }

  get mriTransformStyle() {
    return `scale(${this.imgZoom}) translate(${this.panX / this.imgZoom}px, ${this.panY / this.imgZoom}px)`;
  }

  startDrag(event: MouseEvent) {
    if (this.imgZoom <= 1.0) return;
    this.isDragging = true;
    this.startX = event.clientX - this.panX;
    this.startY = event.clientY - this.panY;
  }

  doDrag(event: MouseEvent) {
    if (!this.isDragging) return;
    this.panX = event.clientX - this.startX;
    this.panY = event.clientY - this.startY;
  }

  stopDrag() { this.isDragging = false; }

  downloadFilteredImage() {
    if (!this.selectedAnalyse?.imageIRM) return;
    const link = document.createElement('a');
    link.href = this.selectedAnalyse.imageIRM;
    link.download = `IRM_${this.selectedPatient.nom}_${this.selectedAnalyse.date}.jpg`;
    link.click();
  }

  // ═══════════════════════════════════════════════════════
  // Heart Rate Monitoring Methods
  // ═══════════════════════════════════════════════════════

  initHeartRateMonitoring(): void {
    if (!this.selectedPatient?.user?.id) return;
    this.connectHeartRateStream(this.selectedPatient.user.id);
    this.connectAiStream(this.selectedPatient.user.id);
    this.loadHeartRateHistory(this.selectedPatient.user.id);
    this.startHeartRateInactivityChecker();
  }

  stopHeartRateMonitoring(): void {
    this.heartRateSseSubscription?.unsubscribe();
    this.aiSseSubscription?.unsubscribe();
    if (this.heartRateInactivityInterval) clearInterval(this.heartRateInactivityInterval);
    if (this.heartRateReconnectTimeout) clearTimeout(this.heartRateReconnectTimeout);
  }

  refreshHeartRate(): void {
    this.stopHeartRateMonitoring();
    this.initHeartRateMonitoring();
  }

  private connectHeartRateStream(userId: number): void {
    this.heartRateSseSubscription = this.heartRateService.connectLiveStream(userId).subscribe({
      next: (event: any) => {
        this.ngZone.run(() => {
          this.currentBpm = event.bpm;
          this.deviceName = event.deviceName || '—';
          this.lastRecordedAt = event.receivedAt || event.capturedAt || '';
          this.heartRateStatus = 'connected';
          this.lastHeartRateEventTimestamp = Date.now();
          if (this.aiStatus === 'disconnected') { this.aiStatus = 'waiting'; this.aiResult = null; }
          this.bpmHistory.push(event.bpm);
          if (this.bpmHistory.length > 30) this.bpmHistory.shift();
          this.history.unshift({
            eventId: event.eventId,
            userId: event.userId,
            deviceName: event.deviceName,
            bpm: event.bpm,
            source: event.source,
            capturedAt: event.capturedAt,
            receivedAt: event.receivedAt,
            recordedAt: event.receivedAt || ''
          });
          if (this.history.length > 50) this.history.pop();
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.heartRateStatus = 'disconnected';
          this.currentBpm = null;
          this.deviceName = '—';
          this.aiStatus = 'disconnected';
          this.aiResult = null;
          this.cdr.detectChanges();
        });
        this.heartRateReconnectTimeout = setTimeout(() => {
          if (this.selectedPatient?.user?.id) this.connectHeartRateStream(this.selectedPatient.user.id);
        }, 3000);
      }
    });
  }

  private connectAiStream(userId: number): void {
    this.aiSseSubscription = this.heartRateAiService.connectAiStream(userId).subscribe({
      next: (result: HeartRateAiResult) => {
        this.ngZone.run(() => {
          if (this.heartRateStatus === 'disconnected') { this.aiStatus = 'disconnected'; this.aiResult = null; this.cdr.detectChanges(); return; }
          this.aiResult = result;
          switch (result.status) {
            case 'WAITING': this.aiStatus = 'waiting'; break;
            case 'READY': this.aiStatus = 'ready'; break;
            case 'ERROR': this.aiStatus = 'error'; break;
            default: this.aiStatus = 'idle';
          }
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.aiStatus = this.heartRateStatus === 'disconnected' ? 'disconnected' : 'error';
          this.aiResult = null;
          this.cdr.detectChanges();
        });
        setTimeout(() => {
          if (this.selectedPatient?.user?.id) this.connectAiStream(this.selectedPatient.user.id);
        }, 5000);
      }
    });
  }

  private loadHeartRateHistory(userId: number): void {
    this.heartRateService.getHistory(userId).subscribe({
      next: records => { this.history = (records || []).slice(0, 50); },
      error: () => { this.history = []; }
    });
  }

  private startHeartRateInactivityChecker(): void {
    if (this.heartRateInactivityInterval) clearInterval(this.heartRateInactivityInterval);
    this.heartRateInactivityInterval = setInterval(() => {
      if (this.lastHeartRateEventTimestamp > 0 && Date.now() - this.lastHeartRateEventTimestamp >= this.HEART_RATE_INACTIVITY_MS && this.heartRateStatus !== 'disconnected') {
        this.heartRateStatus = 'disconnected';
        this.currentBpm = null;
        this.deviceName = '—';
        this.aiStatus = 'disconnected';
        this.aiResult = null;
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  getBpmZone(): string {
    if (!this.currentBpm) return 'Déconnecté';
    if (this.currentBpm < 60) return 'Bradycardie';
    if (this.currentBpm <= 100) return 'État Normal';
    return 'Tachycardie';
  }

  getBpmClass(): string {
    if (!this.currentBpm) return '';
    if (this.currentBpm < 60) return 'bpm-low';
    if (this.currentBpm > 100) return 'bpm-high';
    return 'bpm-normal';
  }

  getAverageBpm(): number {
    if (!this.bpmHistory.length) return 0;
    return Math.round(this.bpmHistory.reduce((a, b) => a + b, 0) / this.bpmHistory.length);
  }

  getMinBpm(): number { return this.bpmHistory.length ? Math.min(...this.bpmHistory) : 0; }
  getMaxBpm(): number { return this.bpmHistory.length ? Math.max(...this.bpmHistory) : 0; }

  getAiProgressPercent(): number {
    if (!this.aiResult) return 0;
    return Math.round((this.aiResult.readingsCollected / this.aiResult.readingsRequired) * 100);
  }

  getAiRiskColor(): string {
    if (!this.aiResult || this.aiResult.status !== 'READY') return '#6b7280';
    switch (this.aiResult.riskLevel) {
      case 'NORMAL': return '#10b981';
      case 'ATTENTION': return '#f59e0b';
      case 'SURVEILLANCE': return '#f97316';
      case 'ALERTE': return '#ef4444';
      default: return '#6b7280';
    }
  }

  getAiRiskIcon(): string {
    if (!this.aiResult || this.aiResult.status !== 'READY') return 'fa-circle-question';
    switch (this.aiResult.riskLevel) {
      case 'NORMAL': return 'fa-circle-check';
      case 'ATTENTION': return 'fa-triangle-exclamation';
      case 'SURVEILLANCE': return 'fa-eye';
      case 'ALERTE': return 'fa-bell';
      default: return 'fa-circle-question';
    }
  }

  getAiProbabilityPercent(): number {
    if (!this.aiResult || this.aiResult.probability == null) return 0;
    return Math.round(this.aiResult.probability * 100);
  }

  formatTimestamp(ts: string): string {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return ts; }
  }
}
