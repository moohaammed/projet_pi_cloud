import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { RendezVousService } from '../../services/rendezvous.service';
import { StatutRendezVous } from '../../models/rendezvous.model';

@Component({
  selector: 'app-rendezvous-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './rendezvous-form.component.html',
  styleUrls: ['./rendezvous-form.component.css']
})
export class RendezVousFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  editId: number | null = null;
  loading = false;
  submitting = false;
  success = '';
  error = '';

  statutOptions: StatutRendezVous[] = ['PLANIFIE', 'CONFIRME', 'ANNULE', 'TERMINE'];
  statutLabels: Record<StatutRendezVous, string> = {
    PLANIFIE: 'Planifié',
    CONFIRME: 'Confirmé',
    ANNULE: 'Annulé',
    TERMINE: 'Terminé'
  };

  // Minimum date: today
  get minDate(): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  constructor(
    private fb: FormBuilder,
    private service: RendezVousService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.buildForm();

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEdit = true;
      this.editId = +id;
      this.loadExisting(this.editId);
    }
  }

  buildForm(): void {
    this.form = this.fb.group({
      patientId: [null, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
      medecinId: [null, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
      dateHeure: ['', [Validators.required, this.futureDateValidator.bind(this)]],
      motif: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      observations: ['', [Validators.maxLength(500)]],
      statut: ['PLANIFIE', Validators.required]
    });
  }

  futureDateValidator(control: AbstractControl) {
    if (!control.value) return null;
    const selected = new Date(control.value);
    const now = new Date();
    // For edit, allow past dates
    if (this.isEdit) return null;
    if (selected <= now) {
      return { pastDate: true };
    }
    return null;
  }

  loadExisting(id: number): void {
    this.loading = true;
    this.service.getById(id).subscribe({
      next: (rv) => {
        const dateStr = rv.dateHeure
          ? new Date(rv.dateHeure).toISOString().slice(0, 16)
          : '';
        this.form.patchValue({
          patientId: rv.patientId,
          medecinId: rv.medecinId,
          dateHeure: dateStr,
          motif: rv.motif,
          observations: rv.observations ?? '',
          statut: rv.statut ?? 'PLANIFIE'
        });
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger le rendez-vous.';
        this.loading = false;
      }
    });
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  getError(field: string): string {
    const ctrl = this.form.get(field);
    if (!ctrl || !ctrl.errors) return '';
    if (ctrl.errors['required']) return 'Ce champ est obligatoire.';
    if (ctrl.errors['min']) return `La valeur minimale est ${ctrl.errors['min'].min}.`;
    if (ctrl.errors['pattern']) return 'Veuillez saisir un nombre entier positif.';
    if (ctrl.errors['minlength']) return `Minimum ${ctrl.errors['minlength'].requiredLength} caractères requis.`;
    if (ctrl.errors['maxlength']) return `Maximum ${ctrl.errors['maxlength'].requiredLength} caractères autorisés.`;
    if (ctrl.errors['pastDate']) return 'La date doit être dans le futur.';
    return 'Valeur invalide.';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    this.error = '';
    this.success = '';

    const payload = this.form.value;

    if (this.isEdit && this.editId !== null) {
      this.service.update(this.editId, payload).subscribe({
        next: () => {
          this.success = 'Rendez-vous mis à jour avec succès !';
          this.submitting = false;
          setTimeout(() => this.router.navigate(['/rendezvous']), 1500);
        },
        error: () => {
          this.error = 'Erreur lors de la mise à jour. Veuillez réessayer.';
          this.submitting = false;
        }
      });
    } else {
      this.service.create(payload).subscribe({
        next: () => {
          this.success = 'Rendez-vous créé avec succès !';
          this.submitting = false;
          setTimeout(() => this.router.navigate(['/rendezvous']), 1500);
        },
        error: () => {
          this.error = 'Erreur lors de la création. Veuillez réessayer.';
          this.submitting = false;
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/rendezvous']);
  }
}
