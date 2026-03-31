import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { RendezVousService } from '../../services/rendezvous.service';
import { RendezVous, StatutRendezVous } from '../../models/rendezvous.model';

@Component({
  selector: 'app-rendezvous-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './rendezvous-detail.component.html',
  styleUrls: ['./rendezvous-detail.component.css']
})
export class RendezVousDetailComponent implements OnInit {
  rv: RendezVous | null = null;
  loading = true;
  error = '';
  deleteConfirm = false;

  statutLabels: Record<StatutRendezVous, string> = {
    PLANIFIE: 'Planifié',
    CONFIRME: 'Confirmé',
    ANNULE: 'Annulé',
    TERMINE: 'Terminé'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: RendezVousService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.service.getById(+id).subscribe({
        next: (data) => {
          this.rv = data;
          this.loading = false;
        },
        error: () => {
          this.error = 'Rendez-vous introuvable.';
          this.loading = false;
        }
      });
    }
  }

  getStatutClass(statut?: StatutRendezVous): string {
    const classes: Record<string, string> = {
      PLANIFIE: 'badge-planifie',
      CONFIRME: 'badge-confirme',
      ANNULE: 'badge-annule',
      TERMINE: 'badge-termine'
    };
    return statut ? classes[statut] ?? '' : '';
  }

  doDelete(): void {
    if (this.rv?.id) {
      this.service.delete(this.rv.id).subscribe({
        next: () => this.router.navigate(['/rendezvous']),
        error: () => { this.error = 'Erreur lors de la suppression.'; }
      });
    }
  }
}
