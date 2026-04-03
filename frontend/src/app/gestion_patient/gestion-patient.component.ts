import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientFormComponent } from './patient-form/patient-form.component';
import { PatientDashboardComponent } from './patient-dashboard/patient-dashboard.component';

@Component({
    selector: 'app-gestion-patient',
    standalone: true,
    imports: [CommonModule, PatientFormComponent, PatientDashboardComponent],
    templateUrl: './gestion-patient.component.html',
    styleUrls: ['./gestion-patient.component.css']
})
export class GestionPatientComponent {

    @ViewChild(PatientDashboardComponent)
    dashboardComponent!: PatientDashboardComponent;

    // Triggers when a new patient is successfully added in the form
    onPatientAdded(): void {
        if (this.dashboardComponent) {
            // Refresh the table manually without reloading the page
            this.dashboardComponent.fetchPatients();
        }
    }
}
