import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PatientService } from '../services/patient.service';

@Component({
    selector: 'app-patient-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './patient-form.component.html',
    styleUrls: ['./patient-form.component.css']
})
export class PatientFormComponent {
    @Output() patientAdded = new EventEmitter<void>();
    patientForm: FormGroup;
    isSubmitting: boolean = false;
    selectedFile: File | null = null;
    dragOver: boolean = false;

    constructor(private fb: FormBuilder, private patientService: PatientService) {
        this.patientForm = this.fb.group({
            nom: ['', Validators.required],
            prenom: ['', Validators.required],
            age: ['', [Validators.required, Validators.min(0)]],
            poids: ['', [Validators.required, Validators.min(0)]],
            sexe: ['Homme', Validators.required]
        });
    }

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
        }
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        this.dragOver = true;
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        this.dragOver = false;
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        this.dragOver = false;
        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            this.selectedFile = event.dataTransfer.files[0];
        }
    }

    onSubmit(): void {
        if (this.patientForm.invalid) {
            return;
        }

        this.isSubmitting = true;

        // Default user_id hardcoded for testing as requested
        const newPatient = {
            ...this.patientForm.value,
            user_id: 1
        };

        this.patientService.createPatient(newPatient).subscribe({
            next: (res) => {
                this.isSubmitting = false;
                this.patientForm.reset({ sexe: 'Homme' });
                this.selectedFile = null;
                this.patientAdded.emit();
            },
            error: (err) => {
                console.error('Error adding patient', err);
                this.isSubmitting = false;
                alert('Erreur lors de l’ajout du patient.');
            }
        });
    }
}
