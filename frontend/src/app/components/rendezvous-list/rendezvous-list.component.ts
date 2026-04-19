import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RendezVous, StatutRendezVous } from '../../models/rendezvous.model';
import { RendezVousService } from '../../services/rendezvous.service';
import { AuthService } from '../../services/auth.service';

import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

@Component({
  selector: 'app-rendezvous-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FullCalendarModule],
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
  deleteConfirmId: string | null = null;
  currentUser: any = null;

  viewMode: 'list' | 'calendar' = 'list';
  calendarEvents: EventInput[] = [];

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    editable: true,
    droppable: true,
    eventDrop: this.handleEventDrop.bind(this),
    eventClick: this.handleEventClick.bind(this),
    events: [],
    height: 700
  };

  statutOptions: StatutRendezVous[] = ['PLANIFIE', 'CONFIRME', 'ANNULE', 'TERMINE'];

  statutLabels: Record<StatutRendezVous, string> = {
    PLANIFIE: 'Planifié',
    CONFIRME: 'Confirmé',
    ANNULE: 'Annulé',
    TERMINE: 'Terminé'
  };

  constructor(
    private service: RendezVousService,
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

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
    let baseList = this.rendezvousList;

    if (this.currentUser) {
      if (this.currentUser.role === 'DOCTOR') {
        baseList = baseList.filter(rv => rv.medecinId === this.currentUser.id);
      } else if (this.currentUser.role === 'PATIENT') {
        baseList = baseList.filter(rv => rv.patientId === this.currentUser.id);
      }
    }

    this.filteredList = baseList.filter(rv => {
      const matchPatient = this.searchPatientId === '' || rv.patientId?.toString().includes(this.searchPatientId);
      const matchMedecin = this.searchMedecinId === '' || rv.medecinId?.toString().includes(this.searchMedecinId);
      const matchStatut = this.filterStatut === '' || rv.statut === this.filterStatut;
      return matchPatient && matchMedecin && matchStatut;
    });

    this.updateAlerts(baseList);
    this.updateCalendarEvents();
  }

  // Alerts
  upcomingIn30MinsList: RendezVous[] = [];
  unconfirmedTodayAlerts = 0;

  updateAlerts(baseList: RendezVous[]): void {
    this.upcomingIn30MinsList = [];
    this.unconfirmedTodayAlerts = 0;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const in30Mins = new Date(now.getTime() + 30 * 60000);

    baseList.forEach(rv => {
      if (rv.dateHeure) {
        if (rv.dateHeure.startsWith(todayStr) && rv.statut === 'PLANIFIE') {
          this.unconfirmedTodayAlerts++;
        }
        
        const rvDate = new Date(rv.dateHeure);
        if (rvDate > now && rvDate <= in30Mins && rv.statut !== 'ANNULE' && rv.statut !== 'TERMINE') {
          this.upcomingIn30MinsList.push(rv);
        }
      }
    });
  }

  updateCalendarEvents(): void {
    this.calendarEvents = this.filteredList.map(rv => {
      const colorMap: any = {
        PLANIFIE: '#f39c12',
        CONFIRME: '#2ecc71',
        ANNULE: '#e74c3c',
        TERMINE: '#3498db'
      };
      
      return {
        id: rv.id.toString(),
        title: rv.motif || 'Rendez-vous',
        start: rv.dateHeure,
        backgroundColor: colorMap[rv.statut || 'PLANIFIE'] || '#95a5a6',
        borderColor: colorMap[rv.statut || 'PLANIFIE'] || '#95a5a6',
        allDay: false,
        extendedProps: { ...rv }
      };
    });
    this.calendarOptions.events = this.calendarEvents;
  }

  handleEventDrop(info: any): void {
    const droppedEvent = info.event;
    const rvId = droppedEvent.id;
    const newStart = droppedEvent.start;

    const existingRvIndex = this.rendezvousList.findIndex(rv => rv.id === rvId);
    if (existingRvIndex === -1) {
      info.revert();
      return;
    }

    const rvToUpdate = { ...this.rendezvousList[existingRvIndex] };
    
    // Convert dates removing Z timezone to match local backend expectations
    const offset = newStart.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(newStart.getTime() - offset)).toISOString().slice(0, 16);
    rvToUpdate.dateHeure = localISOTime;

    this.service.update(rvId, rvToUpdate).subscribe({
      next: (updatedRv) => {
        this.rendezvousList[existingRvIndex] = updatedRv;
        this.applyFilters();
      },
      error: () => {
        alert('Erreur lors du déplacement du rendez-vous.');
        info.revert();
      }
    });
  }

  handleEventClick(info: any): void {
    const rvId = info.event.id;
    this.router.navigate(['/rendezvous', rvId]);
  }

  confirmDelete(id: string): void {
    this.deleteConfirmId = id;
  }

  cancelDelete(): void {
    this.deleteConfirmId = null;
  }

  doDelete(id: string): void {
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

  changeStatut(id: string, statut: StatutRendezVous): void {
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

  // --- Patient Profile View ---
  selectedPatientId: number | null = null;
  patientHistory: RendezVous[] = [];
  patientStatus: { label: string, color: string } = { label: 'Inconnu', color: 'secondary' };
  patientNotes: string[] = [];

  openPatientProfile(patientId: number | undefined): void {
    if (!patientId) return;
    this.selectedPatientId = patientId;
    
    // Historique
    this.patientHistory = this.rendezvousList.filter(rv => rv.patientId === patientId).sort((a, b) => {
      return new Date(b.dateHeure || '').getTime() - new Date(a.dateHeure || '').getTime();
    });

    // Notes Médicales (extraites depuis les motifs des RDV terminés)
    this.patientNotes = this.patientHistory
      .filter(rv => rv.statut === 'TERMINE' && rv.motif)
      .map(rv => `Consultation le ${new Date(rv.dateHeure!).toLocaleDateString('fr-FR')} : ${rv.motif}`);
    if (this.patientNotes.length === 0) this.patientNotes.push("Aucune note médicale disponible.");

    // Calcul du Statut (fidele, annulateur, standard)
    const total = this.patientHistory.length;
    const annules = this.patientHistory.filter(rv => rv.statut === 'ANNULE').length;
    
    if (total === 0) {
      this.patientStatus = { label: 'Nouveau', color: 'primary' };
    } else if ((annules / total) >= 0.5 && annules >= 2) {
      this.patientStatus = { label: 'Absences courantes (Risque)', color: 'danger' };
    } else if (total >= 3 && annules === 0) {
      this.patientStatus = { label: 'Fidèle', color: 'success' };
    } else {
      this.patientStatus = { label: 'Standard', color: 'info' };
    }
  }

  closePatientProfile(): void {
    this.selectedPatientId = null;
  }
}
