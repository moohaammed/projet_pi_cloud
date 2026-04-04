import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../services/education/event.service';
import { CalendarEvent } from '../../../models/education/event.model';

@Component({
  selector: 'app-event-front',
  templateUrl: './event_front.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Fraunces:wght@700;800&display=swap');

    :host {
      --green:        #16754D;
      --green-light:  #e8f5ee;
      --green-mid:    #c3e6d3;
      --green-hover:  #125f3e;
      --white:        #ffffff;
      --bg:           #f2f6f4;
      --card-bg:      #ffffff;
      --border:       #d4e6dc;
      --text-dark:    #1a2e24;
      --text-mid:     #4a6357;
      --text-light:   #8aaa98;
      --shadow:       0 2px 16px rgba(22, 117, 77, 0.08);
      --shadow-card:  0 4px 24px rgba(22, 117, 77, 0.10);
      --radius:       16px;
      --radius-sm:    10px;
      display: block;
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
    }

    /* ── PAGE ── */
    .events-page {
      background: var(--bg);
      min-height: 100vh;
      padding: 40px 32px 60px;
    }

    /* ── HEADER ── */
    .page-header {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 28px;
      flex-wrap: wrap;
    }
    .header-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: .2em;
      text-transform: uppercase;
      color: var(--green);
      margin-bottom: 6px;
    }
    .eyebrow-dot {
      width: 5px; height: 5px;
      background: var(--green);
      border-radius: 50%;
      display: inline-block;
    }
    .page-title {
      font-family: 'Fraunces', serif;
      font-size: 2.8rem;
      font-weight: 800;
      color: var(--text-dark);
      margin: 0;
      line-height: 1;
      letter-spacing: -.02em;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* ── SEARCH ── */
    .search-box {
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: 50px;
      padding: 10px 18px;
      box-shadow: var(--shadow);
      transition: border-color 0.2s;
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-box:focus-within {
      border-color: var(--green);
    }
    .search-icon {
      position: absolute; left: 14px;
      width: 15px; height: 15px;
      color: var(--text-light);
      pointer-events: none;
    }
    .search-input {
      background: transparent;
      border: none;
      padding: 1px 4px 1px 28px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .875rem;
      color: var(--text-dark);
      outline: none;
      width: 250px;
    }
    .search-input::placeholder {
      color: var(--text-light);
    }

    /* ── BUTTON ── */
    .btn-create {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--green);
      color: var(--white);
      border: none;
      padding: 11px 22px;
      border-radius: 50px;
      cursor: pointer;
      font-weight: 700;
      font-size: 14px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
      box-shadow: 0 4px 14px rgba(22, 117, 77, 0.30);
      letter-spacing: .01em;
    }
    .btn-create svg { width: 15px; height: 15px; }
    .btn-create:hover {
      background: var(--green-hover);
      box-shadow: 0 6px 18px rgba(22, 117, 77, 0.38);
      transform: translateY(-1px);
    }
    .btn-create:active { transform: translateY(0); }

    /* ── STATS BAR ── */
    .stats-bar {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      gap: 0;
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: 50px;
      padding: 8px 8px;
      margin-bottom: 36px;
      box-shadow: var(--shadow);
    }
    .stat {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 20px;
    }
    .stat-icon {
      width: 32px; height: 32px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon.total,
    .stat-icon.upcoming {
      background: var(--green-light);
      color: var(--green);
    }
    .stat-icon.past {
      background: #f0f4f2;
      color: var(--text-light);
    }
    .stat-icon svg { width: 15px; height: 15px; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-number {
      font-family: 'Fraunces', serif;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-dark);
      line-height: 1;
    }
    .stat-label {
      font-size: .72rem;
      color: var(--text-mid);
      font-weight: 500;
      margin-top: 1px;
    }
    .stat-divider {
      width: 1px;
      height: 28px;
      background: var(--border);
    }

    /* ── GRID ── */
    .events-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 22px;
    }

    /* ── CARD ── */
    .event-card {
      background: var(--card-bg);
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: var(--shadow-card);
      transition: transform .28s cubic-bezier(.34,1.56,.64,1), box-shadow .28s ease;
      display: flex;
      flex-direction: column;
    }
    .event-card:hover {
      box-shadow: 0 12px 36px rgba(22, 117, 77, 0.15);
      transform: translateY(-4px);
    }
    .event-card:hover .card-actions-overlay { opacity: 1; }
    .event-card:hover .card-image { transform: scale(1.06); }

    .card-image-wrapper {
      position: relative;
      height: 195px;
      overflow: hidden;
      background: #d8dff0;
    }
    .card-image {
      width: 100%; height: 100%;
      object-fit: cover;
      transition: transform .45s ease;
    }
    .card-image-wrapper::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(26,46,36,.35) 0%, transparent 55%);
      pointer-events: none;
    }

    /* Badge */
    .card-badge {
      position: absolute;
      top: 12px; left: 12px;
      z-index: 1;
      padding: 4px 12px;
      border-radius: 50px;
      font-size: .67rem;
      font-weight: 700;
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    .card-badge.upcoming {
      background: var(--green);
      color: var(--white);
    }
    .card-badge.past {
      background: rgba(0, 0, 0, 0.45);
      color: var(--white);
    }

    /* Action buttons overlay */
    .card-actions-overlay {
      position: absolute;
      top: 10px; right: 10px;
      z-index: 2;
      display: flex;
      gap: 6px;
      opacity: 0;
      transition: opacity .2s;
    }
    .action-btn {
      width: 34px; height: 34px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform .15s;
    }
    .action-btn svg { width: 14px; height: 14px; }
    .action-btn:hover { transform: scale(1.12); }
    .edit-btn   { background: rgba(255, 255, 255, 0.92); color: var(--green); }
    .delete-btn { background: rgba(255, 255, 255, 0.92); color: #c0392b; }

    /* ── CARD BODY ── */
    .card-body {
      padding: 18px 20px 22px;
      display: flex;
      flex-direction: column;
      gap: 11px;
      flex: 1;
    }
    .card-date-row { display: flex; gap: 6px; flex-wrap: wrap; }
    .date-pill, .time-pill {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: .7rem;
      font-weight: 600;
      background: var(--green-light);
      color: var(--green);
      border-radius: 50px;
      padding: 4px 10px;
    }
    .date-pill svg, .time-pill svg { width: 11px; height: 11px; }

    .card-title {
      font-family: 'Fraunces', serif;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-dark);
      margin: 0;
      line-height: 1.35;
      word-break: break-word;
      letter-spacing: -.01em;
    }
    .card-description {
      font-size: .81rem;
      color: var(--text-mid);
      margin: 0;
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-separator {
      height: 1px;
      background: var(--border);
      margin-top: auto;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    .card-location {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: .79rem;
      color: var(--text-mid);
      font-weight: 500;
      min-width: 0;
    }
    .card-location svg { width: 13px; height: 13px; flex-shrink: 0; color: var(--green); }
    .card-location span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .card-remind {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: .7rem;
      font-weight: 700;
      color: var(--green);
      background: var(--green-light);
      padding: 3px 10px;
      border-radius: 50px;
      white-space: nowrap;
    }
    .card-remind svg { width: 11px; height: 11px; }

    /* ── PAGINATION ── */
    .pagination {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 44px;
    }
    .page-btn {
      min-width: 40px;
      height: 40px;
      padding: 0 12px;
      border-radius: 12px;
      border: 1.5px solid var(--border);
      background: var(--white);
      color: var(--text-mid);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .875rem;
      font-weight: 600;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all .18s;
      box-shadow: var(--shadow);
    }
    .page-btn svg { width: 16px; height: 16px; }
    .page-btn:hover:not(:disabled) {
      border-color: var(--green);
      color: var(--green);
      transform: translateY(-1px);
    }
    .page-btn.active {
      background: var(--green);
      border-color: var(--green);
      color: var(--white);
      font-weight: 700;
      box-shadow: 0 4px 16px rgba(22, 117, 77, 0.3);
    }
    .page-btn:disabled { opacity: .4; cursor: not-allowed; }

    /* ── EMPTY STATE ── */
    .empty-state {
      position: relative; z-index: 1;
      display: flex; flex-direction: column;
      align-items: center;
      padding: 90px 20px;
      gap: 14px;
      text-align: center;
    }
    .empty-glass {
      width: 120px; height: 120px;
      border-radius: 30px;
      background: var(--green-light);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 8px;
    }
    .empty-glass svg { width: 52px; height: 52px; color: var(--green); }
    .empty-title {
      font-family: 'Fraunces', serif;
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text-dark);
      margin: 0;
    }
    .empty-sub { font-size: .88rem; color: var(--text-light); margin: 0; }

    /* ── MODAL ── */
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(22, 60, 38, 0.35);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .modal-card {
      background: var(--white);
      border-radius: var(--radius);
      width: 100%; max-width: 520px;
      box-shadow: 0 24px 60px rgba(22, 117, 77, 0.18);
      overflow: hidden;
      animation: slideUp .25s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px) scale(.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 24px 28px 20px;
      border-bottom: 1px solid var(--border);
    }
    .modal-title {
      font-family: 'Fraunces', serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-dark);
      margin: 0;
    }
    .modal-close {
      background: var(--green-light);
      color: var(--green);
      border: none;
      cursor: pointer;
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      transition: background .15s;
    }
    .modal-close:hover { background: var(--green-mid); }
    .modal-close svg { width: 18px; height: 18px; }

    /* Form */
    .form-body { padding: 22px 28px; display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 5px; }
    .form-label {
      font-size: .75rem;
      font-weight: 700;
      color: var(--text-mid);
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    .required { color: var(--green); }
    .form-input {
      border: 1.5px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .9rem;
      color: var(--text-dark);
      background: var(--white);
      outline: none;
      transition: border-color .2s, box-shadow .2s;
    }
    .form-input:focus {
      border-color: var(--green);
      box-shadow: 0 0 0 3px rgba(22, 117, 77, 0.10);
    }
    .has-error .form-input { border-color: #e74c3c; }
    .error-msg { font-size: .75rem; color: #e74c3c; font-weight: 500; }
    .form-textarea { resize: vertical; min-height: 80px; line-height: 1.55; }

    /* File upload */
    .file-upload-area {
      border: 2px dashed var(--green-mid);
      border-radius: var(--radius-sm);
      padding: 20px;
      display: flex; flex-direction: column; align-items: center;
      gap: 7px; cursor: pointer;
      transition: border-color .2s, background .2s;
      color: var(--green);
      font-size: .83rem;
      text-align: center;
      background: var(--green-light);
    }
    .file-upload-area:hover {
      background: var(--green-mid);
      border-color: var(--green);
    }
    .file-upload-area svg { width: 28px; height: 28px; color: var(--green); }
    .file-name { color: var(--green-hover); font-weight: 600; }

    /* Toggle */
    .remind-toggle { flex-direction: row; align-items: center; }
    .toggle-label {
      display: flex; align-items: center;
      justify-content: space-between; width: 100%;
      cursor: pointer;
      font-size: .9rem;
      color: var(--text-mid);
      font-weight: 500;
    }
    .toggle-switch {
      width: 44px; height: 24px;
      background: var(--border);
      border-radius: 50px;
      position: relative;
      transition: background .2s;
      flex-shrink: 0;
    }
    .toggle-switch.active { background: var(--green); }
    .toggle-knob {
      position: absolute; top: 3px; left: 3px;
      width: 18px; height: 18px;
      background: var(--white);
      border-radius: 50%;
      transition: transform .2s;
      box-shadow: 0 1px 4px rgba(0,0,0,.15);
    }
    .toggle-switch.active .toggle-knob { transform: translateX(20px); }

    /* Modal footer */
    .modal-footer {
      display: flex; justify-content: flex-end; gap: 10px;
      padding: 16px 28px 24px;
      border-top: 1px solid var(--border);
    }
    .btn-cancel {
      background: var(--white);
      border: 1.5px solid var(--border);
      color: var(--text-mid);
      border-radius: 50px;
      padding: 9px 22px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .875rem;
      font-weight: 600;
      cursor: pointer;
      transition: border-color .2s, color .2s;
    }
    .btn-cancel:hover {
      border-color: var(--green);
      color: var(--green);
    }
    .btn-save {
      background: var(--green);
      color: var(--white);
      border: none;
      border-radius: 50px;
      padding: 9px 26px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .875rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(22, 117, 77, 0.28);
      transition: background .2s, transform .2s, box-shadow .2s;
    }
    .btn-save:hover {
      background: var(--green-hover);
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(22, 117, 77, 0.36);
    }

    @media (max-width: 1100px) {
      .events-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .events-page { padding: 24px 18px 56px; }
      .page-title { font-size: 2rem; }
      .events-grid { grid-template-columns: 1fr; }
      .header-right { width: 100%; }
      .search-input { width: 100%; }
    }
  `]
})
export class EventFrontComponent implements OnInit {

  events: CalendarEvent[] = [];
  selected: CalendarEvent | null = null;
  isEditing = false;
  selectedFile: File | null = null;
  showForm = false;
  searchQuery = '';

  currentPage = 1;
  pageSize = 6;

  errors: { [key: string]: string } = {};

  newEvent: CalendarEvent = {
    title: '',
    startDateTime: '',
    location: '',
    description: '',
    remindEnabled: false,
    userId: 1
  };

  constructor(private eventService: EventService) {}

  ngOnInit() { this.load(); }

  load() {
    this.eventService.getAll().subscribe((data: CalendarEvent[]) => {
      this.events = data;
      this.currentPage = 1;
    });
  }

  get filteredEvents(): CalendarEvent[] {
    if (!this.searchQuery.trim()) return this.events;
    const q = this.searchQuery.toLowerCase();
    return this.events.filter(e =>
      e.title?.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q)
    );
  }

  get totalPages(): number { return Math.ceil(this.filteredEvents.length / this.pageSize); }
  get pageNumbers(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }
  get pagedEvents(): CalendarEvent[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEvents.slice(start, start + this.pageSize);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onSearchChange() { this.currentPage = 1; }

  onFileSelected(event: any) {
    const file: File = event.target.files?.[0] ?? null;
    this.errors['image'] = '';
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.errors['image'] = 'Format invalide. Seuls JPG, PNG et WEBP sont acceptés.';
        this.selectedFile = null; return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.errors['image'] = "L'image ne doit pas dépasser 5 MB.";
        this.selectedFile = null; return;
      }
      this.selectedFile = file;
    }
  }

  validate(): boolean {
    this.errors = {};
    const title = this.newEvent.title?.trim();
    if (!title) this.errors['title'] = 'Le titre est obligatoire.';
    else if (title.length < 3) this.errors['title'] = 'Le titre doit contenir au moins 3 caractères.';
    else if (title.length > 100) this.errors['title'] = 'Le titre ne doit pas dépasser 100 caractères.';

    const dateValue = this.newEvent.startDateTime?.trim();
    if (!dateValue) {
      this.errors['startDateTime'] = "La date et l'heure sont obligatoires.";
    } else {
      const sel = new Date(dateValue);
      const now = new Date();
      const oneYear = new Date(); oneYear.setFullYear(now.getFullYear() + 1);
      if (isNaN(sel.getTime())) this.errors['startDateTime'] = 'La date est invalide.';
      else if (sel < now) this.errors['startDateTime'] = 'La date ne peut pas être dans le passé.';
      else if (sel > oneYear) this.errors['startDateTime'] = 'La date ne peut pas dépasser un an dans le futur.';
    }

    const location = this.newEvent.location?.trim();
    if (!location) this.errors['location'] = 'Le lieu est obligatoire.';
    else if (location.length < 2) this.errors['location'] = 'Le lieu doit contenir au moins 2 caractères.';

    const desc = this.newEvent.description?.trim();
    if (desc && desc.length > 500) this.errors['description'] = 'La description ne doit pas dépasser 500 caractères.';

    if (!this.selectedFile && !this.isEditing) this.errors['image'] = "L'image est obligatoire.";
    return Object.keys(this.errors).length === 0;
  }

  getImageUrl(imageUrl?: string): string {
    if (!imageUrl) return 'assets/images/event-placeholder.jpg';
    return 'http://localhost:8080' + imageUrl;
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  isUpcoming(dateStr?: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) > new Date();
  }

  getUpcomingCount(): number {
    return this.events.filter(e => this.isUpcoming(e.startDateTime)).length;
  }

  onImgError(event: any) { event.target.src = 'assets/images/event-placeholder.jpg'; }

  save() {
    if (!this.validate()) return;
    if (this.isEditing && this.selected?.id) {
      this.eventService.update(this.selected.id, this.newEvent).subscribe((updated) => {
        if (this.selectedFile) this.eventService.uploadImage(updated.id!, this.selectedFile).subscribe(() => this.load());
        else this.load();
        this.reset();
      });
    } else {
      this.eventService.create(this.newEvent).subscribe((created) => {
        if (this.selectedFile) this.eventService.uploadImage(created.id!, this.selectedFile).subscribe(() => this.load());
        else this.load();
        this.reset();
      });
    }
  }

  edit(event: CalendarEvent) {
    this.selected = event;
    this.newEvent = { ...event, description: event.description || '' };
    this.isEditing = true; this.showForm = true; this.errors = {};
  }

  delete(id: number) {
    if (confirm('Voulez-vous vraiment supprimer cet événement ?'))
      this.eventService.delete(id).subscribe(() => this.load());
  }

  openForm() { this.reset(); this.showForm = true; }

  reset() {
    this.selectedFile = null; this.errors = {};
    this.newEvent = { title: '', startDateTime: '', location: '', description: '', remindEnabled: false, userId: 1 };
    this.selected = null; this.isEditing = false; this.showForm = false;
  }
}