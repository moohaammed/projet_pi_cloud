import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RendezVous, StatutRendezVous } from '../../models/rendezvous.model';
import { RendezVousService } from '../../services/rendezvous.service';

@Component({
  selector: 'app-rendezvous-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './rendezvous-list.component.html',
  styleUrls: ['./rendezvous-list.component.css']
})
export class RendezVousListComponent implements OnInit {
  rendezvousList: RendezVous[] = [];
  filteredList: RendezVous[] = [];
  loading = true;
  error = '';
  searchPatientId = '';
  searchMedecinId = '';
  filterStatut = '';
  deleteConfirmId: number | null = null;

  statutOptions: StatutRendezVous[] = ['PLANIFIE', 'CONFIRME', 'ANNULE', 'TERMINE'];

  statutLabels: Record<StatutRendezVous, string> = {
    PLANIFIE: 'Planifié',
    CONFIRME: 'Confirmé',
    ANNULE: 'Annulé',
    TERMINE: 'Terminé'
  };

  constructor(private service: RendezVousService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    this.error = '';
    this.service.getAll().subscribe({
      next: (data) => {
        this.rendezvousList = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de charger les rendez-vous. Vérifiez que le serveur est démarré.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredList = this.rendezvousList.filter(rv => {
      const matchPatient = this.searchPatientId === '' || rv.patientId?.toString().includes(this.searchPatientId);
      const matchMedecin = this.searchMedecinId === '' || rv.medecinId?.toString().includes(this.searchMedecinId);
      const matchStatut = this.filterStatut === '' || rv.statut === this.filterStatut;
      return matchPatient && matchMedecin && matchStatut;
    });
  }

  confirmDelete(id: number): void {
    this.deleteConfirmId = id;
  }

  cancelDelete(): void {
    this.deleteConfirmId = null;
  }

  doDelete(id: number): void {
    this.service.delete(id).subscribe({
      next: () => {
        this.rendezvousList = this.rendezvousList.filter(rv => rv.id !== id);
        this.applyFilters();
        this.deleteConfirmId = null;
      },
      error: () => {
        this.error = 'Erreur lors de la suppression.';
        this.deleteConfirmId = null;
      }
    });
  }

  changeStatut(id: number, statut: StatutRendezVous): void {
    this.service.updateStatut(id, statut).subscribe({
      next: (updated) => {
        const idx = this.rendezvousList.findIndex(rv => rv.id === id);
        if (idx !== -1) this.rendezvousList[idx] = updated;
        this.applyFilters();
      },
      error: () => {
        this.error = 'Erreur lors de la mise à jour du statut.';
      }
    });
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

  resetFilters(): void {
    this.searchPatientId = '';
    this.searchMedecinId = '';
    this.filterStatut = '';
    this.applyFilters();
  }
}
