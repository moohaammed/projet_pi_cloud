import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { RendezVousService } from '../../services/rendezvous.service';
import { RendezVous, StatutRendezVous } from '../../models/rendezvous.model';
import { VideoCallComponent } from '../videocall/videocall.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-rendezvous-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, VideoCallComponent],
  templateUrl: './rendezvous-detail.component.html',
  styleUrls: ['./rendezvous-detail.component.css']
})
export class RendezVousDetailComponent implements OnInit {
  rv: RendezVous | null = null;
  loading = true;
  error = '';
  deleteConfirm = false;
  showVideoCall = false;
  currentUser: any = null;

  statutLabels: Record<StatutRendezVous, string> = {
    PLANIFIE: 'Planifié',
    CONFIRME: 'Confirmé',
    ANNULE: 'Annulé',
    TERMINE: 'Terminé'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: RendezVousService,
    private authService: AuthService
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.service.getById(+id).subscribe({
        next: (data) => {
          // Check access
          if (this.currentUser) {
            if (this.currentUser.role === 'DOCTOR' && data.medecinId !== this.currentUser.id) {
              this.error = 'Accès refusé. Ce rendez-vous ne vous est pas assigné.';
              this.loading = false;
              return;
            }
            if (this.currentUser.role === 'PATIENT' && data.patientId !== this.currentUser.id) {
              this.error = 'Accès refusé. Ce rendez-vous ne vous est pas assigné.';
              this.loading = false;
              return;
            }
          }

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
    const map: Record<StatutRendezVous, string> = {
      PLANIFIE: 'bg-warning',
      CONFIRME: 'bg-success',
      ANNULE: 'bg-danger',
      TERMINE: 'bg-primary'
    };
    return statut ? map[statut] ?? 'bg-secondary' : 'bg-secondary';
  }

  deleteRv(id: number): void {
    if (confirm('Voulez-vous vraiment supprimer ce rendez-vous ?')) {
      this.service.delete(id).subscribe({
        next: () => this.router.navigate(['/rendezvous']),
        error: () => { this.error = 'Erreur lors de la suppression.'; }
      });
    }
  }

  toggleVideoCall(): void {
    this.showVideoCall = !this.showVideoCall;
  }
}
