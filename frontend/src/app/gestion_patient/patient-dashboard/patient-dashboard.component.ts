import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientService } from '../services/patient.service';
import { Patient, Analyse, NotificationPatient } from '../models/patient.model';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.css']
})
export class PatientDashboardComponent implements OnInit {

  patients: Patient[] = [];
  loading = false;

  // Modal analyses
  showModal = false;
  selectedPatient: Patient | null = null;
  patientAnalyses: Analyse[] = [];
  loadingAnalyses = false;

  // Notifications sidebar
  notifications: NotificationPatient[] = [];

  constructor(private patientService: PatientService) {}

  ngOnInit(): void {
    this.fetchPatients();
    this.initNotifications();
  }

  fetchPatients(): void {
    this.loading = true;
    this.patientService.getAllPatients().subscribe({
      next: (data) => {
        this.patients = data;
        this.loading = false;
        this.updateUrgentNotification();
      },
      error: (err) => {
        console.error('Error fetching patients', err);
        this.loading = false;
      }
    });
  }

  // ── Computed stats ──────────────────────────────────────────────
  get totalPatients(): number { return this.patients.length; }
  get urgentCount(): number   { return this.patients.filter(p => this.getPatientStatus(p) === 'Urgent').length; }
  get suiviCount(): number    { return this.patients.filter(p => this.getPatientStatus(p) === 'Suivi').length; }
  get stableCount(): number   { return this.patients.filter(p => this.getPatientStatus(p) === 'Stable').length; }
  get unreadNotifCount(): number { return this.notifications.filter(n => !n.read).length; }

  // ── Patient status (computed client-side from age) ────────────
  getPatientStatus(p: Patient): 'Stable' | 'Suivi' | 'Urgent' {
    if (p.age >= 80) return 'Urgent';
    if (p.age >= 65) return 'Suivi';
    return 'Stable';
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Urgent': return 'badge bg-danger';
      case 'Suivi':  return 'badge bg-warning text-dark';
      default:       return 'badge bg-success';
    }
  }

  getAnalyseBadgeClass(statut?: string): string {
    switch (statut) {
      case 'TERMINÉ':  return 'badge bg-success';
      case 'EN_COURS': return 'badge bg-warning text-dark';
      default:         return 'badge bg-secondary';
    }
  }

  // ── Actions ──────────────────────────────────────────────────
  viewAnalyses(patient: Patient): void {
    if (!patient.id) return;
    this.selectedPatient = patient;
    this.patientAnalyses = [];
    this.loadingAnalyses = true;
    this.showModal = true;

    this.patientService.getAnalysesByPatient(patient.id).subscribe({
      next: (data) => {
        this.patientAnalyses = data || [];
        this.loadingAnalyses = false;
      },
      error: (err) => {
        console.error('Error loading analyses', err);
        this.loadingAnalyses = false;
      }
    });
  }

  deletePatient(id?: number): void {
    if (!id) return;
    if (confirm('Voulez-vous vraiment supprimer ce patient ?')) {
      this.patientService.deletePatient(id).subscribe({
        next: () => this.fetchPatients(),
        error: (err) => console.error(err)
      });
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedPatient = null;
    this.patientAnalyses = [];
  }

  // ── Notifications ──────────────────────────────────────────────
  initNotifications(): void {
    this.notifications = [
      {
        message: 'Rappel : Bilan sanguin semestriel à planifier pour les patients ≥ 65 ans.',
        type: 'info',
        date: new Date().toLocaleDateString('fr-FR'),
        read: false
      },
      {
        message: 'Résultats IRM en attente de validation médicale.',
        type: 'warning',
        date: new Date().toLocaleDateString('fr-FR'),
        read: false
      },
      {
        message: 'Mise à jour du protocole neuro-Alzheimer disponible.',
        type: 'success',
        date: new Date().toLocaleDateString('fr-FR'),
        read: false
      }
    ];
  }

  updateUrgentNotification(): void {
    const count = this.urgentCount;
    if (count > 0) {
      this.notifications.unshift({
        message: `${count} patient(s) en état critique nécessitent une attention immédiate.`,
        type: 'danger',
        date: new Date().toLocaleDateString('fr-FR'),
        read: false
      });
    }
  }

  markAsRead(notif: NotificationPatient): void {
    notif.read = true;
  }

  getInitials(p: Patient): string {
    return `${p.nom.charAt(0)}${p.prenom.charAt(0)}`.toUpperCase();
  }
}
