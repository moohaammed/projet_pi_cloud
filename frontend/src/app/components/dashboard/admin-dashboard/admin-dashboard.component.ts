import { Component, OnInit, ElementRef, ViewChildren, QueryList, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { RendezVousService } from '../../../services/rendezvous.service';
import { RendezVous, StatutRendezVous } from '../../../models/rendezvous.model';

import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import { Chart, ChartConfiguration, registerables } from 'chart.js';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FullCalendarModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('chartCanvas') chartCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;

  rendezvousList: RendezVous[] = [];
  filteredList: RendezVous[] = [];
  loading = true;
  error = '';
  
  // Stats
  totalRv = 0;
  todayRv = 0;
  planifie = 0;
  confirme = 0;
  annule = 0;
  termine = 0;

  filterStatut = '';
  viewMode: 'list' | 'calendar' = 'list';

  // Calendar
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
    height: 600
  };

  statutOptions: StatutRendezVous[] = ['PLANIFIE', 'CONFIRME', 'ANNULE', 'TERMINE'];
  statutLabels: Record<StatutRendezVous, string> = {
    PLANIFIE: 'Planifié',
    CONFIRME: 'Confirmé',
    ANNULE: 'Annulé',
    TERMINE: 'Terminé'
  };

  charts: Chart[] = [];

  constructor(private rvService: RendezVousService, private router: Router) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.loadAll();
  }

  ngAfterViewInit(): void {
    // Wait for the DOM and data to be ready before plotting
    setTimeout(() => {
      if (this.rendezvousList.length > 0) this.buildCharts();
    }, 500);
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  loadAll(): void {
    this.loading = true;
    this.error = '';
    this.rvService.getAll().subscribe({
      next: (data) => {
        this.rendezvousList = data;
        this.calculateStats();
        this.applyFilters();
        if (this.chartCanvases && this.chartCanvases.length > 0) {
          this.buildCharts();
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors du chargement des rendez-vous.';
        this.loading = false;
      }
    });
  }

  // Alerts
  unconfirmedTodayAlerts = 0;
  upcomingIn30MinsAlerts = 0;
  absentPatientsAlerts: number[] = [];

  calculateStats(): void {
    this.totalRv = this.rendezvousList.length;
    this.planifie = 0;
    this.confirme = 0;
    this.annule = 0;
    this.termine = 0;
    this.todayRv = 0;

    this.unconfirmedTodayAlerts = 0;
    this.upcomingIn30MinsAlerts = 0;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const in30Mins = new Date(now.getTime() + 30 * 60000);

    const absentMap: { [key: number]: number } = {};

    this.rendezvousList.forEach(rv => {
      if (rv.statut === 'PLANIFIE') this.planifie++;
      else if (rv.statut === 'CONFIRME') this.confirme++;
      else if (rv.statut === 'ANNULE') {
        this.annule++;
        if (rv.patientId) absentMap[rv.patientId] = (absentMap[rv.patientId] || 0) + 1;
      }
      else if (rv.statut === 'TERMINE') this.termine++;

      if (rv.dateHeure) {
        if (rv.dateHeure.startsWith(todayStr)) {
          this.todayRv++;
          // Non confirmés aujourd'hui (juste PLANIFIE)
          if (rv.statut === 'PLANIFIE') {
            this.unconfirmedTodayAlerts++;
          }
        }

        // Prochain RDV dans 30 min (entre maintenant et +30min)
        const rvDate = new Date(rv.dateHeure);
        if (rvDate > now && rvDate <= in30Mins && rv.statut !== 'ANNULE') {
          this.upcomingIn30MinsAlerts++;
        }
      }
    });

    this.absentPatientsAlerts = Object.keys(absentMap)
      .filter(pId => absentMap[Number(pId)] >= 2)
      .map(pId => Number(pId));
  }

  applyFilters(): void {
    this.filteredList = this.rendezvousList.filter(rv => {
      const matchStatut = this.filterStatut === '' || rv.statut === this.filterStatut;
      return matchStatut;
    });
    this.updateCalendarEvents();
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

    // Trigger open modal programmatically (can be pure CSS/NgIf but setting a flag is enough for a custom modal overlay)
  }

  closePatientProfile(): void {
    this.selectedPatientId = null;
  }
  // ---------------------------

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
        allDay: false
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
    const offset = newStart.getTimezoneOffset() * 60000;
    rvToUpdate.dateHeure = (new Date(newStart.getTime() - offset)).toISOString().slice(0, 16);

    this.rvService.update(rvId, rvToUpdate).subscribe({
      next: (updatedRv) => {
        this.rendezvousList[existingRvIndex] = updatedRv;
        this.calculateStats();
        this.applyFilters();
        this.buildCharts();
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

  deleteRv(id: string): void {
    if (confirm('Voulez-vous vraiment supprimer ce rendez-vous ?')) {
      this.rvService.delete(id).subscribe({
        next: () => {
          this.rendezvousList = this.rendezvousList.filter(rv => rv.id !== id);
          this.calculateStats();
          this.applyFilters();
          this.buildCharts();
        },
        error: () => {
          this.error = 'Erreur lors de la suppression.';
        }
      });
    }
  }

  changeStatut(id: string, statut: StatutRendezVous): void {
    this.rvService.updateStatut(id, statut).subscribe({
      next: (updated) => {
        const idx = this.rendezvousList.findIndex(rv => rv.id === id);
        if (idx !== -1) {
          this.rendezvousList[idx] = updated;
          this.calculateStats();
          this.applyFilters();
          this.buildCharts();
        }
      },
      error: () => {
        this.error = 'Erreur lors de la mise à jour du statut.';
      }
    });
  }

  getStatutBadge(statut?: StatutRendezVous): string {
    switch (statut) {
      case 'PLANIFIE': return 'badge bg-warning';
      case 'CONFIRME': return 'badge bg-success';
      case 'ANNULE': return 'badge bg-danger';
      case 'TERMINE': return 'badge bg-primary';
      default: return 'badge bg-secondary';
    }
  }

  // ==== CHARTS ====
  private buildCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    const canvases = this.chartCanvases.toArray();
    if (canvases.length < 3) return;

    // 1. Taux de confirmation / annulation (Pie Chart)
    const ctxPie = canvases[0].nativeElement;
    this.charts.push(new Chart(ctxPie, {
      type: 'doughnut',
      data: {
        labels: ['Confirmés/Terminés', 'Annulés', 'Planifiés'],
        datasets: [{
          data: [this.confirme + this.termine, this.annule, this.planifie],
          backgroundColor: ['#2ecc71', '#e74c3c', '#f39c12']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    }));

    // 2. Nombre de rendez-vous par jour (derniers 7 jours par défaut ou simple regroupement)
    const rdvParJourMap: { [key: string]: number } = {};
    const heursMap: { [key: string]: number } = {};

    this.rendezvousList.forEach(rv => {
      if (rv.dateHeure) {
        const datePart = rv.dateHeure.split('T')[0];
        const hourPart = rv.dateHeure.split('T')[1].split(':')[0]; // Ex: "14"

        // Par Jour
        rdvParJourMap[datePart] = (rdvParJourMap[datePart] || 0) + 1;
        
        // Hrues plus chargées
        heursMap[hourPart] = (heursMap[hourPart] || 0) + 1;
      }
    });

    const datesTriees = Object.keys(rdvParJourMap).sort();
    const freqData = datesTriees.map(d => rdvParJourMap[d]);
    // Truncate to last 14 unique dates if it's too long
    const shortDates = datesTriees.slice(-14);
    const shortData = freqData.slice(-14);

    const ctxLine = canvases[1].nativeElement;
    this.charts.push(new Chart(ctxLine, {
      type: 'line',
      data: {
        labels: shortDates,
        datasets: [{
          label: 'Nombre de Rendez-vous',
          data: shortData,
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.2)',
          fill: true,
          tension: 0.4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    }));

    // 3. Heures les plus chargées (Bar Chart)
    const hoursSorted = Object.keys(heursMap).sort((a,b) => parseInt(a) - parseInt(b));
    const hoursData = hoursSorted.map(h => heursMap[h]);
    
    const ctxBar = canvases[2].nativeElement;
    this.charts.push(new Chart(ctxBar, {
      type: 'bar',
      data: {
        labels: hoursSorted.map(h => h + 'h00'),
        datasets: [{
          label: 'Volume de RDV',
          data: hoursData,
          backgroundColor: '#9b59b6',
          borderRadius: 5
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    }));
  }
}
