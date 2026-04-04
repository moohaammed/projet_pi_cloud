import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PatientService } from '../services/patient.service';
import { AnalyseService } from '../services/analyse.service';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './patient-dashboard.component.html',
  styleUrl: './patient-dashboard.component.css'
})
export class PatientDashboardComponent implements OnInit {
  patientId: number | null = null;
  patient: any = { nom: '', prenom: '', age: null, poids: null, sexe: 'Homme', user_id: null };
  analyses: any[] = [];

  newAnalyse: any = { rapport_medical: '', image_irm: '', score_jeu: null };
  selectedAnalyse: any = null;

  isLoadingPatient = false;
  isLoadingAnalyses = false;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private patientService: PatientService,
    private analyseService: AnalyseService
  ) { }

  ngOnInit(): void {
    // Load only if we have a known patient ID
    if (this.patientId) {
      this.loadPatientProfile();
      this.loadAnalyses();
    }
  }

  showSuccess(msg: string) {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 4000);
  }

  showError(msg: string) {
    this.errorMessage = msg;
    this.successMessage = '';
    setTimeout(() => this.errorMessage = '', 6000);
  }

  loadPatientProfile() {
    if (!this.patientId) return;
    this.isLoadingPatient = true;
    this.patientService.getPatientById(this.patientId!).subscribe({
      next: (data) => {
        if (data) {
          // Mapping object back if backend returns camelCase but we want our form bindings to be simple
          this.patient = {
            nom: data.nom,
            prenom: data.prenom,
            age: data.age,
            poids: data.poids,
            sexe: data.sexe,
            user_id: data.user ? data.user.id : 1
          };
        }
        this.isLoadingPatient = false;
      },
      error: (err) => {
        console.error("Failed to load patient", err);
        this.isLoadingPatient = false;
      }
    });
  }

  loadPatient() {
    if (!this.patientId) return;
    this.loadPatientProfile();
    this.loadAnalyses();
  }

  addPatient() {
    if (!this.patient.nom || !this.patient.prenom) {
      this.showError("Veuillez remplir au moins le nom et le prénom.");
      return;
    }
    this.isSubmitting = true;
    this.patientService.addPatient(this.patient).subscribe({
      next: (data) => {
        this.showSuccess(`Patient "${data.nom} ${data.prenom}" créé avec succès (ID: ${data.id})`);
        this.patientId = data.id;
        this.loadAnalyses();
        this.isSubmitting = false;
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Erreur lors de la création du patient.';
        this.showError(`Erreur: ${msg}`);
        console.error('[PatientDashboard] addPatient error:', err);
        this.isSubmitting = false;
      }
    });
  }

  updateProfile() {
    if (!this.patientId) { this.showError('Aucun patient sélectionné. Créez-en un d\'abord.'); return; }
    this.isSubmitting = true;
    this.patientService.updatePatient(this.patientId!, this.patient).subscribe({
      next: () => {
        this.showSuccess("Patient mis à jour avec succès");
        this.isSubmitting = false;
      },
      error: (err) => {
        this.showError(err?.error?.message || 'Erreur de mise à jour.');
        this.isSubmitting = false;
      }
    });
  }

  deletePatient() {
    if (!this.patientId) { this.showError('Aucun patient à supprimer.'); return; }
    if (confirm("Êtes-vous sûr de vouloir supprimer votre profil ?")) {
      this.patientService.deletePatient(this.patientId!).subscribe({
        next: () => {
          this.showSuccess("Profil supprimé !");
          this.patientId = null;
          this.patient = { nom: '', prenom: '', age: null, poids: null, sexe: 'Homme', user_id: null };
          this.analyses = [];
        },
        error: (err) => this.showError(err?.error?.message || 'Erreur de suppression.')
      });
    }
  }

  loadAnalyses() {
    if (!this.patientId) return;
    this.isLoadingAnalyses = true;
    this.analyseService.getAnalysesByPatient(this.patientId!).subscribe({
      next: (data) => {
        this.analyses = data || [];
        this.isLoadingAnalyses = false;
      },
      error: () => this.isLoadingAnalyses = false
    });
  }

  submitAnalyse() {
    this.isSubmitting = true;
    const dateStr = new Date().toISOString().split('T')[0];

    if (!this.patientId) { this.showError('Sélectionnez ou créez un patient d\'abord.'); this.isSubmitting = false; return; }
    // Explicit format exactly as required
    const payload = {
      patient_id: this.patientId!,
      date: dateStr,
      statut: "EN_COURS",
      rapport_medical: this.newAnalyse.rapport_medical,
      image_irm: this.newAnalyse.image_irm,
      score_jeu: this.newAnalyse.score_jeu,
      pourcentage_risque: null,
      interpretation: null
    };

    this.analyseService.addAnalyse(payload).subscribe({
      next: (data) => {
        console.log('[PatientDashboard] Analyse insérée avec succès:', data);
        this.showSuccess("Analyse envoyée et enregistrée dans la base de données !");
        this.newAnalyse = { rapport_medical: '', image_irm: '', score_jeu: null };
        this.loadAnalyses();
        this.isSubmitting = false;
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || err?.error || JSON.stringify(err);
        console.error('[PatientDashboard] Error submitAnalyse:', err);
        this.showError(`Erreur lors de l'envoi de l'analyse: ${msg}`);
        this.isSubmitting = false;
      }
    });
  }

  onFileSelected(event: any, field: 'rapport_medical' | 'image_irm') {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newAnalyse[field] = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  viewDetails(analyse: any) {
    this.selectedAnalyse = analyse;
  }
}
