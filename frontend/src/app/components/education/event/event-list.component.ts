import { Component, OnInit, ElementRef, ViewChildren, QueryList, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { EventSeatGridComponent } from './event-seat-grid.component';
import { EventService } from '../../../services/education/event.service';
import { EventSeatService } from '../../../services/education/event-seat.service';
import { CalendarEvent } from '../../../models/education/event.model';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, EventSeatGridComponent]
})
export class EventListComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('chartCanvas') chartCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;
  charts: Chart[] = [];
  
  showSeats = false;
  currentEvent: CalendarEvent | null = null;

  allEvents: CalendarEvent[] = [];
  selected: CalendarEvent | null = null;
  isEditing = false;
  showForm = false;
  selectedFile: File | null = null;
  searchTerm = '';
  
  showAttendeesModal = false;
  attendees: any[] = [];
  isLoadingAttendees = false;

  // ✅ Objet pour stocker les erreurs
  errors: { [key: string]: string } = {};

  newEvent: CalendarEvent = {
    title: '',
    startDateTime: '',
    location: '',
    description: '',
    remindEnabled: false,
    userId: 1,
    capacity: 0
  };

  constructor(
    private eventService: EventService,
    private seatService: EventSeatService
  ) {
    Chart.register(...registerables);
  }

  ngOnInit() { this.load(); }

  ngAfterViewInit() {
    setTimeout(() => { if (this.allEvents.length > 0) this.buildCharts(); }, 500);
  }

  ngOnDestroy() {
    this.charts.forEach(c => c.destroy());
  }

  load() {
    this.eventService.getAll().subscribe({
      next: (data: CalendarEvent[]) => {
        this.allEvents = data;
        if (this.chartCanvases && this.chartCanvases.length > 0) {
          this.buildCharts();
        }
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Erreur lors du chargement des événements';
        alert(msg);
      }
    });
  }

  get filteredEvents(): CalendarEvent[] {
    return this.allEvents.filter(e => {
      const term = this.searchTerm.toLowerCase().trim();
      return !term || 
             e.title?.toLowerCase().includes(term) || 
             e.description?.toLowerCase().includes(term) ||
             e.location?.toLowerCase().includes(term) ||
             e.id?.toString().includes(term);
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files?.[0] ?? null;
    this.errors['image'] = '';

    if (file) {
      // ✅ Vérifier le type de fichier
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.errors['image'] = 'Format invalide. Seuls JPG, PNG et WEBP sont acceptés.';
        this.selectedFile = null;
        return;
      }
      // ✅ Vérifier la taille (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.errors['image'] = 'L\'image ne doit pas dépasser 5 MB.';
        this.selectedFile = null;
        return;
      }
      this.selectedFile = file;
    }
  }

  // ✅ Méthode de validation complète
  validate(): boolean {
    this.errors = {};

    // --- Titre ---
    const title = this.newEvent.title?.trim();
    if (!title) {
      this.errors['title'] = 'Le titre est obligatoire.';
    } else if (title.length < 3) {
      this.errors['title'] = 'Le titre doit contenir au moins 3 caractères.';
    } else if (title.length > 100) {
      this.errors['title'] = 'Le titre ne doit pas dépasser 100 caractères.';
    }

    // --- Date et heure ---
    const dateValue = this.newEvent.startDateTime?.trim();
    if (!dateValue) {
      this.errors['startDateTime'] = 'La date et l\'heure sont obligatoires.';
    } else {
      const selected = new Date(dateValue);
      const now = new Date();
      
      // On définit une limite raisonnable (ex: 2 ans maximum dans le futur)
      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(now.getFullYear() + 2);

      if (isNaN(selected.getTime())) {
        this.errors['startDateTime'] = 'La date est invalide.';
      } else if (selected < now) {
        this.errors['startDateTime'] = 'La date ne peut pas être dans le passé.';
      } else if (selected > maxFutureDate) {
        this.errors['startDateTime'] = 'La date est trop lointaine (max 2 ans dans le futur).';
      }
    }

    // --- Lieu ---
    const location = this.newEvent.location?.trim();
    if (!location) {
      this.errors['location'] = 'Le lieu est obligatoire.';
    } else if (location.length < 2) {
      this.errors['location'] = 'Le lieu doit contenir au moins 2 caractères.';
    }

    // --- Description ---
    const desc = this.newEvent.description?.trim();
    if (!desc) {
      this.errors['description'] = 'La description est obligatoire.';
    } else if (desc.length < 10) {
      this.errors['description'] = 'La description doit contenir au moins 10 caractères.';
    } else if (desc.length > 500) {
      this.errors['description'] = 'La description ne doit pas dépasser 500 caractères.';
    }

    // --- Image (required) ---
    if (!this.selectedFile && !this.isEditing) {
      this.errors['image'] = 'L\'image est obligatoire.';
    }

    // --- Capacité ---
    const capacity = this.newEvent.capacity;
    if (capacity === null || capacity === undefined) {
      this.errors['capacity'] = 'La capacité est obligatoire.';
    } else if (capacity <= 0) {
      this.errors['capacity'] = 'La capacité doit être supérieure à 0.';
    } else if (capacity > 500) {
      this.errors['capacity'] = 'La capacité maximale est de 500 places.';
    }

    return Object.keys(this.errors).length === 0;
  }

  getImageUrl(imageUrl?: string): string {
    if (!imageUrl) return '';
    return environment.apiUrl + imageUrl;
  }

  save() {
    // ✅ Bloquer si validation échoue
    if (!this.validate()) return;

    if (this.isEditing && this.selected?.id) {
      this.eventService.update(this.selected.id, this.newEvent)
        .subscribe({
          next: (updated) => {
            if (this.selectedFile) {
              this.eventService.uploadImage(updated.id!, this.selectedFile)
                .subscribe({
                  next: () => this.load(),
                  error: (err) => alert('Erreur lors de l\'envoi de l\'image: ' + (err.error?.message || err.message))
                });
            } else {
              this.load();
            }
            this.reset();
          },
          error: (err) => {
            const msg = err.error?.message || err.message || 'Erreur lors de la modification';
            alert(msg);
          }
        });
    } else {
      this.eventService.create(this.newEvent)
        .subscribe({
          next: (created) => {
            if (this.selectedFile) {
              this.eventService.uploadImage(created.id!, this.selectedFile)
                .subscribe({
                  next: () => this.load(),
                  error: (err) => alert('Erreur lors de l\'envoi de l\'image: ' + (err.error?.message || err.message))
                });
            } else {
              this.load();
            }
            this.reset();
          },
          error: (err) => {
            const msg = err.error?.message || err.message || 'Erreur lors de la création';
            alert(msg);
          }
        });
    }
  }

  edit(event: CalendarEvent) {
    this.selected = event;
    this.newEvent = { ...event };
    this.isEditing = true;
    this.showForm = true;
    this.errors = {};
  }

  delete(id: string) {
    if (confirm('Voulez-vous vraiment supprimer cet événement ?')) {
      this.eventService.delete(id).subscribe({
        next: () => this.load(),
        error: (err) => {
          const msg = err.error?.message || err.message || 'Erreur lors de la suppression';
          alert(msg);
        }
      });
    }
  }

  viewSeats(event: CalendarEvent) {
    this.currentEvent = event;
    this.showSeats = true;
    this.showForm = false;
  }

  onSeatsClosed() {
    this.showSeats = false;
    this.currentEvent = null;
    this.load(); // Rafraîchir les places dispo
  }

  viewAttendees(event: CalendarEvent) {
    if (!event.id) return;
    this.currentEvent = event;
    this.showAttendeesModal = true;
    this.isLoadingAttendees = true;
    this.attendees = [];
    
    this.seatService.getAttendees(event.id).subscribe({
      next: (data) => {
        this.attendees = data;
        this.isLoadingAttendees = false;
      },
      error: (err) => {
        alert('Erreur lors du chargement des participants');
        this.isLoadingAttendees = false;
        this.closeAttendeesModal();
      }
    });
  }

  closeAttendeesModal() {
    this.showAttendeesModal = false;
    this.attendees = [];
    this.currentEvent = null;
  }

  reset() {
    this.selectedFile = null;
    this.errors = {};
    this.newEvent = {
      title: '',
      startDateTime: '',
      location: '',
      description: '',
      remindEnabled: false,
      userId: 1,
      capacity: 0
    };
    this.selected = null;
    this.isEditing = false;
    this.showForm = false;
  }

  // --- Stats Getters ---
  get totalEvents(): number { return this.allEvents.length; }

  get futureEvents(): number {
    const now = new Date();
    return this.allEvents.filter(e => e.startDateTime && new Date(e.startDateTime) > now).length;
  }

  get pastEvents(): number {
    const now = new Date();
    return this.allEvents.filter(e => e.startDateTime && new Date(e.startDateTime) <= now).length;
  }

  get totalCapacity(): number {
    return this.allEvents.reduce((acc, e) => acc + (e.capacity || 0), 0);
  }

  get bookedTotal(): number {
    return this.allEvents.reduce((acc, e) => acc + ((e.capacity || 0) - (e.availablePlaces || 0)), 0);
  }

  get fillRate(): number {
    if (this.totalCapacity === 0) return 0;
    return Math.round((this.bookedTotal / this.totalCapacity) * 100);
  }

  get nextEventDate(): string | null {
    if (this.allEvents.length === 0) return null;
    const now = new Date();
    const futureEvts = this.allEvents
      .filter(e => e.startDateTime && new Date(e.startDateTime) > now)
      .sort((a, b) => new Date(a.startDateTime!).getTime() - new Date(b.startDateTime!).getTime());
    return futureEvts.length > 0 ? futureEvts[0].startDateTime! : null;
  }

  get daysUntilNext(): number {
    if (!this.nextEventDate) return 0;
    const diff = new Date(this.nextEventDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // ==== CHARTS ====
  private buildCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    if (!this.chartCanvases) return;
    const canvases = this.chartCanvases.toArray();
    if (canvases.length === 0) return;

    // 1. Occupation Globale (Doughnut)
    if (canvases[0]) {
      const freeSeats = this.totalCapacity - this.bookedTotal;
      const ctxPie = canvases[0].nativeElement;
      this.charts.push(new Chart(ctxPie, {
        type: 'doughnut',
        data: {
          labels: ['Places Réservées', 'Places Disponibles'],
          datasets: [{
            data: [this.bookedTotal, freeSeats],
            backgroundColor: ['#800080', '#e9d5ff'],
            borderWidth: 0
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      }));
    }

    // 2. Évolution du temps (Line) - Événements par mois
    if (canvases[1]) {
      const groupedByMonth: { [key: string]: number } = {};
      this.allEvents.forEach(e => {
        if (e.startDateTime) {
          const month = e.startDateTime.substring(0, 7); // yyyy-mm
          groupedByMonth[month] = (groupedByMonth[month] || 0) + 1;
        }
      });
      const sortedMonths = Object.keys(groupedByMonth).sort();
      const monthData = sortedMonths.map(m => groupedByMonth[m]);
      
      const ctxLine = canvases[1].nativeElement;
      this.charts.push(new Chart(ctxLine, {
        type: 'line',
        data: {
          labels: sortedMonths,
          datasets: [{
            label: 'Nbr d\'événements',
            data: monthData,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
            fill: true, tension: 0.4
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      }));
    }

    // 3. Top des événements par capacité (Bar)
    if (canvases[2]) {
      const topEvents = [...this.allEvents]
        .sort((a, b) => (b.capacity || 0) - (a.capacity || 0))
        .slice(0, 5);
      
      const ctxBar = canvases[2].nativeElement;
      this.charts.push(new Chart(ctxBar, {
        type: 'bar',
        data: {
          labels: topEvents.map(e => e.title?.substring(0, 15) + '...'),
          datasets: [{
            label: 'Capacité Máx',
            data: topEvents.map(e => e.capacity || 0),
            backgroundColor: '#0ea5e9',
            borderRadius: 6
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      }));
    }
  }
}