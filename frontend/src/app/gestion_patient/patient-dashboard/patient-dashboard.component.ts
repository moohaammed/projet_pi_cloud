import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientService } from '../services/patient.service';
import { Patient, Analyse } from '../models/patient.model';

@Component({
    selector: 'app-patient-dashboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './patient-dashboard.component.html',
    styleUrls: ['./patient-dashboard.component.css']
})
export class PatientDashboardComponent implements OnInit {
    patients: Patient[] = [];
    loading: boolean = false;

    // For Analyse Modal
    showModal: boolean = false;
    currentAnalyse: Analyse | null = null;
    analysing: boolean = false;

    constructor(private patientService: PatientService) { }

    ngOnInit(): void {
        this.fetchPatients();
    }

    fetchPatients(): void {
        this.loading = true;
        this.patientService.getPatients().subscribe({
            next: (data) => {
                this.patients = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Error fetching patients', err);
                this.loading = false;
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

    analysePatient(patient: Patient): void {
        if (!patient.id) return;

        // Simulate picking an IRM file
        const fakeFile = new File([''], 'irm_scan_mock.dcm', { type: 'image/dicom' });

        this.analysing = true;
        this.showModal = true;
        this.currentAnalyse = null;

        // Call service to simulate analysis
        this.patientService.uploadIrmAndAnalyse(patient.id, fakeFile).subscribe({
            next: (result) => {
                // Mock delay for UI effect
                setTimeout(() => {
                    this.currentAnalyse = result;
                    this.analysing = false;
                }, 1500);
            },
            error: (err) => {
                console.error('Analyse failed', err);
                this.analysing = false;
            }
        });
    }

    closeModal(): void {
        this.showModal = false;
        this.currentAnalyse = null;
    }
}
