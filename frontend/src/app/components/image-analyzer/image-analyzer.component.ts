import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClipService, ClipResult, ClipPrediction } from '../../services/clip.service';
import { IncidentService, IncidentRequest } from '../../services/incident.service';
import { PatientService } from '../../services/patient.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-image-analyzer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-analyzer.component.html',
  styleUrl: './image-analyzer.component.css'
})
export class ImageAnalyzerComponent implements OnInit {

  // ── State ────────────────────────────────────────────────────────────────────
  imagePreview: string | null = null;
  message: string = '';
  danger: boolean = false;
  loading: boolean = false;
  incidentCreated: boolean = false;
  incidentError: string = '';
  predictions: ClipPrediction[] = [];
  createdIncidentId: string | null = null;
  locationName: string = '';

  // ── Patient selection ──────────────────────────────────────────────────────
  patients: any[] = [];
  selectedPatientId: number | null = null;
  patientsLoading: boolean = false;

  // ── Geolocation ────────────────────────────────────────────────────────────
  latitude: number | null = null;
  longitude: number | null = null;

  constructor(
    private clipService: ClipService,
    private incidentService: IncidentService,
    private patientService: PatientService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadPatients();
    this.captureGeolocation();
  }

  // ── Load patients ──────────────────────────────────────────────────────────
  loadPatients(): void {
    this.patientsLoading = true;
    this.patientService.getAllPatients().subscribe({
      next: (data) => {
        // Filter to only PATIENT role users if objects have role field
        this.patients = data.filter((p: any) => !p.role || p.role === 'PATIENT');
        this.patientsLoading = false;
      },
      error: () => {
        this.patientsLoading = false;
      }
    });
  }

  // ── Geolocation ────────────────────────────────────────────────────────────
  captureGeolocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.latitude = pos.coords.latitude;
          this.longitude = pos.coords.longitude;
        },
        () => {
          // Geolocation refused or unavailable — proceed without it
          this.latitude = null;
          this.longitude = null;
        }
      );
    }
  }

  // ── Image selection ────────────────────────────────────────────────────────
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    this.resetResult();

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result as string;
      this.imagePreview = result;
      this.analyzeImage(result);
    };
    reader.readAsDataURL(file);
  }

  // ── AI Analysis ────────────────────────────────────────────────────────────
// ── AI Analysis ────────────────────────────────────────────────────────────
analyzeImage(base64: string): void {
  this.loading = true;
  this.incidentCreated = false;
  this.incidentError = '';
  this.createdIncidentId = null;

  this.clipService.analyzeImage(base64).subscribe({
    next: (res: ClipResult) => {
      this.loading = false;
      this.message = res.message;
      this.danger = res.danger;
      this.predictions = res.predictions;
      this.lireMessage(res.message);

      // ← CHANGE ICI — crée incident si danger, patient optionnel
      if (res.danger) {
        this.createIncident(res, base64);
      }
    },
    error: () => {
      this.loading = false;
      this.message = "Erreur lors de l'analyse IA. Vérifiez que le serveur FastAPI est démarré.";
      this.danger = false;
    }
  });
}

  // ── Create incident in Spring Boot ─────────────────────────────────────────
 createIncident(result: ClipResult, base64: string): void {
  const currentUser = this.auth.getCurrentUser();
  const topPrediction = result.predictions[0];

  // ← Récupère l'ID correctement
  const reporterId = currentUser?.id 
                  || currentUser?.userId 
                  || currentUser?.sub 
                  || 1;

  console.log('👤 reporterId:', reporterId);
  console.log('📍 location:', this.locationName);

  const request: IncidentRequest = {
    reporterId: reporterId,
    patientId: this.selectedPatientId ?? 0, // ← 0 si pas de patient
    aiAnalysis: topPrediction?.label ?? 'unknown',
    aiConfidence: topPrediction?.score ?? 0,
    latitude: this.latitude ?? undefined,
    longitude: this.longitude ?? undefined,
  };

  console.log('📤 Envoi incident:', request);

  this.incidentService.createFromAi(request).subscribe({
    next: (incident) => {
      console.log('✅ Incident créé:', incident);
      this.incidentCreated = true;
      this.createdIncidentId = incident.id ?? null;
    },
    error: (err) => {
      console.error('❌ Erreur:', err);
      this.incidentError = "L'incident n'a pas pu être enregistré: " + 
        (err?.error?.message || err?.message || JSON.stringify(err?.error) || '');
    }
  });
}

// ── Manual incident creation ────────────────────────────────────────────────
createManualIncident(): void {
  if (!this.predictions.length) return;
  const result: ClipResult = {
    predictions: this.predictions,
    message: this.message,
    danger: this.danger
  };
  this.createIncident(result, this.imagePreview ?? '');
}

  
  // ── Text-to-speech ─────────────────────────────────────────────────────────
  lireMessage(texte: string): void {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    synth.cancel(); // stop any previous speech
    const utterance = new SpeechSynthesisUtterance(texte);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.75; // slow for Alzheimer patients
    utterance.volume = 1;
    utterance.pitch = 1;
    synth.speak(utterance);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  resetResult(): void {
    this.message = '';
    this.danger = false;
    this.predictions = [];
    this.incidentCreated = false;
    this.incidentError = '';
    this.createdIncidentId = null;
  }

  /** Returns percentage string for a confidence score */
  pct(score: number): string {
    return (score * 100).toFixed(1) + '%';
  }

  /** Label → CSS colour class for progress bars */
  barClass(label: string): string {
    if (label === 'dangerous hole') return 'bar-danger';
    if (label === 'obstacle on path') return 'bar-warning';
    if (label === 'stairs') return 'bar-warning';
    if (label === 'safe path' || label === 'clear road') return 'bar-success';
    return 'bar-info';
  }
}