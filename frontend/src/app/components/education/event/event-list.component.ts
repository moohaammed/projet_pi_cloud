import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventSeatGridComponent } from './event-seat-grid.component';
import { EventService } from '../../../services/education/event.service';
import { CalendarEvent } from '../../../models/education/event.model';

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, EventSeatGridComponent]
})
export class EventListComponent implements OnInit {
  
  showSeats = false;
  currentEvent: CalendarEvent | null = null;

  allEvents: CalendarEvent[] = [];
  selected: CalendarEvent | null = null;
  isEditing = false;
  showForm = false;
  selectedFile: File | null = null;
  searchTerm = '';

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

  constructor(private eventService: EventService) {}

  ngOnInit() { this.load(); }

  load() {
    this.eventService.getAll().subscribe((data: CalendarEvent[]) => {
      this.allEvents = data;
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
    return 'http://localhost:8080' + imageUrl;
  }

  save() {
    // ✅ Bloquer si validation échoue
    if (!this.validate()) return;

    if (this.isEditing && this.selected?.id) {
      this.eventService.update(this.selected.id, this.newEvent)
        .subscribe((updated) => {
          if (this.selectedFile) {
            this.eventService.uploadImage(updated.id!, this.selectedFile)
              .subscribe(() => this.load());
          } else {
            this.load();
          }
          this.reset();
        });
    } else {
      this.eventService.create(this.newEvent)
        .subscribe((created) => {
          if (this.selectedFile) {
            this.eventService.uploadImage(created.id!, this.selectedFile)
              .subscribe(() => this.load());
          } else {
            this.load();
          }
          this.reset();
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

  delete(id: number) {
    if (confirm('Voulez-vous vraiment supprimer cet événement ?')) {
      this.eventService.delete(id).subscribe(() => this.load());
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
}