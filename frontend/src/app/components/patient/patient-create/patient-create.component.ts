import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface CreationResponse {
  patientId:           number;
  patientEmail:        string;
  patientMotDePasse:   string;
  relationId?:         number;
  relationEmail?:      string;
  relationMotDePasse?: string;
  message:             string;
}

@Component({
  selector: 'app-patient-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-create.component.html'
})
export class PatientCreateComponent {

  patient = {
    nom: '', prenom: '', email: '', telephone: '',
    dateNaissance: '', adresse: '',
    stadeAlzheimer: 'LEGER', notesMedicales: '',
    latitude:  null as number | null,
    longitude: null as number | null,
    rayonVert:  300,
    rayonRouge: 800,
  };

  creerRelation = true;
  relation = {
    nom: '', prenom: '', email: '', telephone: '',
    lienAvecPatient: 'fils'
  };

  liens  = ['fils', 'fille', 'femme', 'mari', 'frere', 'soeur', 'pere', 'mere', 'autre'];
  stades = [
    { value: 'LEGER',  label: 'Leger'  },
    { value: 'MODERE', label: 'Modere' },
    { value: 'SEVERE', label: 'Severe' },
  ];

  currentStep = 1;
  loading     = false;
  gpsLoading  = false;
  error:  string | null         = null;
  result: CreationResponse | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  nextStep(): void { if (this.currentStep < 4) this.currentStep++; }
  prevStep(): void { if (this.currentStep > 1) this.currentStep--; }

  isStep1Valid(): boolean {
    return !!(this.patient.nom && this.patient.prenom && this.patient.email);
  }

  isStep3Valid(): boolean {
    if (!this.creerRelation) return true;
    return !!(this.relation.nom && this.relation.prenom && this.relation.email);
  }

  captureGPS(): void {
    if (!navigator.geolocation) {
      this.error = 'Geolocalisation non supportee.';
      return;
    }
    this.gpsLoading = true;
    this.error = null;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.patient.latitude  = +pos.coords.latitude.toFixed(6);
        this.patient.longitude = +pos.coords.longitude.toFixed(6);
        this.gpsLoading = false;
      },
      () => {
        this.error      = 'Impossible de recuperer la position GPS.';
        this.gpsLoading = false;
      },
      { timeout: 10000 }
    );
  }

  getMapsUrl(): string {
    return 'https://www.google.com/maps?q=' + this.patient.latitude + ',' + this.patient.longitude;
  }

  submit(): void {
    this.loading = true;
    this.error   = null;
    const payload = {
      patientNom:           this.patient.nom,
      patientPrenom:        this.patient.prenom,
      patientEmail:         this.patient.email,
      patientTelephone:     this.patient.telephone,
      patientDateNaissance: this.patient.dateNaissance,
      patientAdresse:       this.patient.adresse,
      stadeAlzheimer:       this.patient.stadeAlzheimer,
      notesMedicales:       this.patient.notesMedicales,
      latitude:             this.patient.latitude,
      longitude:            this.patient.longitude,
      rayonVert:            this.patient.rayonVert,
      rayonRouge:           this.patient.rayonRouge,
      creerCompteRelation:  this.creerRelation,
      relationNom:          this.relation.nom,
      relationPrenom:       this.relation.prenom,
      relationEmail:        this.relation.email,
      relationTelephone:    this.relation.telephone,
      lienAvecPatient:      this.relation.lienAvecPatient,
    };
    this.http.post<CreationResponse>(
      `${environment.apiUrl}/api/users/creer-avec-relation`, payload
    ).subscribe({
      next: (res) => {
        this.loading     = false;
        this.result      = res;
        this.currentStep = 5;
      },
      error: (err) => {
        this.loading = false;
        this.error   = err.error?.message ?? err.error?.error ?? 'Erreur lors de la creation.';
      }
    });
  }

  resetForm(): void {
    this.currentStep = 1;
    this.result = null;
    this.error  = null;
    this.patient = {
      nom: '', prenom: '', email: '', telephone: '',
      dateNaissance: '', adresse: '', stadeAlzheimer: 'LEGER',
      notesMedicales: '', latitude: null, longitude: null,
      rayonVert: 300, rayonRouge: 800,
    };
    this.relation = { nom: '', prenom: '', email: '', telephone: '', lienAvecPatient: 'fils' };
  }

  goToPatients(): void { this.router.navigate(['/patient-profiles']); }
}