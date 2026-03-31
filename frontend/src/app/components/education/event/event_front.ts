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
      --navy:       #1a2744;
      --navy-mid:   #243058;
      --navy-light: #2e3f70;
      --accent:     #4f72ff;
      --accent-glow:#4f72ff33;
      --glass-bg:   rgba(255,255,255,0.72);
      --glass-border: rgba(255,255,255,0.55);
      --surface:    #ffffff;
      --bg:         #eef1f8;
      --text:       #0f1a35;
      --sub:        #3d4e72;
      --muted:      #7a8baa;
      --danger:     #e0364a;
      --upcoming:   #1a2744;
      --radius-sm:  10px;
      --radius-md:  16px;
      --radius-lg:  22px;
      display: block;
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
    }

    /* ── PAGE ── */
    .events-page {
      min-height: 100vh;
      background: linear-gradient(145deg, #dde4f4 0%, #eef1f8 40%, #e8ecf7 100%);
      padding: 44px 52px 72px;
      position: relative;
    }

    /* Background decorative blobs */
    .events-page::before,
    .events-page::after {
      content: '';
      position: fixed;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
      z-index: 0;
    }
    .events-page::before {
      width: 500px; height: 500px;
      background: radial-gradient(circle, rgba(79,114,255,0.12) 0%, transparent 70%);
      top: -100px; right: -100px;
    }
    .events-page::after {
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(26,39,68,0.10) 0%, transparent 70%);
      bottom: 0; left: -80px;
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
      color: var(--accent);
      margin-bottom: 6px;
    }
    .eyebrow-dot {
      width: 5px; height: 5px;
      background: var(--accent);
      border-radius: 50%;
      display: inline-block;
    }
    .page-title {
      font-family: 'Fraunces', serif;
      font-size: 2.8rem;
      font-weight: 800;
      color: var(--navy);
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
    .search-box { position: relative; display: flex; align-items: center; }
    .search-icon {
      position: absolute; left: 14px;
      width: 15px; height: 15px;
      color: var(--muted); pointer-events: none;
    }
    .search-input {
      background: var(--glass-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1.5px solid var(--glass-border);
      border-radius: 50px;
      padding: 11px 18px 11px 40px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .875rem;
      color: var(--text);
      outline: none;
      width: 250px;
      transition: border-color .2s, box-shadow .2s;
      box-shadow: 0 4px 20px rgba(26,39,68,.08), inset 0 1px 0 rgba(255,255,255,.8);
    }
    .search-input:focus {
      border-color: var(--accent);
      box-shadow: 0 4px 20px rgba(26,39,68,.08), 0 0 0 3px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,.8);
    }
    .search-input::placeholder { color: var(--muted); }

    /* ── BUTTON ── */
    .btn-create {
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, var(--navy-mid) 0%, var(--navy) 100%);
      color: white;
      border: none;
      padding: 11px 22px;
      border-radius: 50px;
      cursor: pointer;
      font-weight: 700;
      font-size: 14px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 16px rgba(26,39,68,.28), 0 1px 0 rgba(255,255,255,.1) inset;
      letter-spacing: .01em;
    }
    .btn-create svg { width: 15px; height: 15px; }
    .btn-create:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 28px rgba(26,39,68,.36), 0 1px 0 rgba(255,255,255,.1) inset;
    }
    .btn-create:active { transform: translateY(0); }

    /* ── STATS BAR ── */
    .stats-bar {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      gap: 0;
      background: var(--glass-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1.5px solid var(--glass-border);
      border-radius: 50px;
      padding: 8px 8px;
      margin-bottom: 36px;
      box-shadow: 0 4px 24px rgba(26,39,68,.10), inset 0 1px 0 rgba(255,255,255,.9);
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
    .stat-icon.total   { background: rgba(26,39,68,.1); }
    .stat-icon.upcoming { background: rgba(79,114,255,.12); }
    .stat-icon.past    { background: rgba(122,139,170,.1); }
    .stat-icon svg { width: 15px; height: 15px; }
    .stat-icon.total svg   { color: var(--navy); }
    .stat-icon.upcoming svg { color: var(--accent); }
    .stat-icon.past svg    { color: var(--muted); }
    .stat-info { display: flex; flex-direction: column; }
    .stat-number {
      font-family: 'Fraunces', serif;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1;
    }
    .stat-label { font-size: .72rem; color: var(--muted); font-weight: 500; margin-top: 1px; }
    .stat-divider { width: 1px; height: 28px; background: rgba(26,39,68,.1); }

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
      background: var(--glass-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1.5px solid var(--glass-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(26,39,68,.08), inset 0 1px 0 rgba(255,255,255,.9);
      transition: transform .28s cubic-bezier(.34,1.56,.64,1), box-shadow .28s ease;
      display: flex;
      flex-direction: column;
    }
    .event-card:hover {
      transform: translateY(-6px) scale(1.01);
      box-shadow: 0 16px 48px rgba(26,39,68,.16), inset 0 1px 0 rgba(255,255,255,.9);
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

    /* Gradient overlay on image */
    .card-image-wrapper::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(26,39,68,.35) 0%, transparent 55%);
      pointer-events: none;
    }

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
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .card-badge.upcoming {
      background: rgba(26,39,68,.75);
      color: #fff;
      border: 1px solid rgba(255,255,255,.2);
    }
    .card-badge.past {
      background: rgba(0,0,0,.45);
      color: rgba(255,255,255,.8);
      border: 1px solid rgba(255,255,255,.1);
    }

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
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .action-btn svg { width: 14px; height: 14px; }
    .action-btn:hover { transform: scale(1.12); }
    .edit-btn   { background: rgba(255,255,255,.9); color: var(--navy); }
    .delete-btn { background: rgba(255,255,255,.9); color: var(--danger); }

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
      color: var(--sub);
      background: rgba(26,39,68,.06);
      border-radius: 50px;
      padding: 4px 10px;
      border: 1px solid rgba(26,39,68,.07);
    }
    .date-pill svg, .time-pill svg { width: 11px; height: 11px; color: var(--accent); }

    .card-title {
      font-family: 'Fraunces', serif;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text);
      margin: 0;
      line-height: 1.35;
      word-break: break-word;
      letter-spacing: -.01em;
    }
    .card-description {
      font-size: .81rem;
      color: var(--muted);
      margin: 0;
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Separator line */
    .card-separator {
      height: 1px;
      background: linear-gradient(to right, rgba(26,39,68,.08), transparent);
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
      color: var(--sub);
      font-weight: 500;
      min-width: 0;
    }
    .card-location svg { width: 13px; height: 13px; flex-shrink: 0; color: var(--accent); }
    .card-location span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .card-remind {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: .7rem;
      font-weight: 700;
      color: var(--accent);
      background: var(--accent-glow);
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
      border: 1.5px solid var(--glass-border);
      background: var(--glass-bg);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: var(--sub);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .875rem;
      font-weight: 600;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all .18s;
      box-shadow: 0 2px 8px rgba(26,39,68,.08);
    }
    .page-btn svg { width: 16px; height: 16px; }
    .page-btn:hover:not(:disabled) {
      background: var(--navy);
      color: #fff;
      border-color: var(--navy);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(26,39,68,.25);
    }
    .page-btn.active {
      background: linear-gradient(135deg, var(--navy-mid), var(--navy));
      color: #fff;
      border-color: transparent;
      font-weight: 700;
      box-shadow: 0 4px 16px rgba(26,39,68,.3);
    }
    .page-btn:disabled { opacity: .3; cursor: not-allowed; }

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
      background: var(--glass-bg);
      backdrop-filter: blur(16px);
      border: 1.5px solid var(--glass-border);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 32px rgba(26,39,68,.1);
      margin-bottom: 8px;
    }
    .empty-glass svg { width: 52px; height: 52px; }
    .empty-title { font-family: 'Fraunces', serif; font-size: 1.4rem; font-weight: 700; color: var(--text); margin: 0; }
    .empty-sub { font-size: .88rem; color: var(--muted); margin: 0; }

    /* ── MODAL ── */
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(15,26,53,.45);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .modal-card {
      background: rgba(255,255,255,.88);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1.5px solid var(--glass-border);
      border-radius: 24px;
      width: 100%; max-width: 520px;
      box-shadow: 0 32px 80px rgba(15,26,53,.22);
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
      border-bottom: 1px solid rgba(26,39,68,.08);
      background: linear-gradient(180deg, rgba(255,255,255,.6) 0%, transparent 100%);
    }
    .modal-title { font-family: 'Fraunces', serif; font-size: 1.25rem; font-weight: 700; color: var(--text); margin: 0; }
    .modal-close {
      background: rgba(26,39,68,.06); border: none; cursor: pointer;
      color: var(--muted); width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 10px; transition: background .15s, color .15s;
    }
    .modal-close:hover { background: rgba(26,39,68,.12); color: var(--text); }
    .modal-close svg { width: 18px; height: 18px; }

    .form-body { padding: 22px 28px; display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 5px; }
    .form-label { font-size: .75rem; font-weight: 700; color: var(--sub); text-transform: uppercase; letter-spacing: .08em; }
    .required { color: var(--danger); }
    .form-input {
      border: 1.5px solid rgba(26,39,68,.14);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .9rem;
      color: var(--text);
      background: rgba(255,255,255,.7);
      backdrop-filter: blur(8px);
      outline: none;
      transition: border-color .2s, box-shadow .2s;
    }
    .form-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-glow);
      background: rgba(255,255,255,.9);
    }
    .has-error .form-input { border-color: var(--danger); }
    .error-msg { font-size: .75rem; color: var(--danger); font-weight: 500; }
    .form-textarea { resize: vertical; min-height: 80px; line-height: 1.55; }

    .file-upload-area {
      border: 2px dashed rgba(26,39,68,.18);
      border-radius: var(--radius-sm);
      padding: 20px;
      display: flex; flex-direction: column; align-items: center;
      gap: 7px; cursor: pointer;
      transition: border-color .2s, background .2s;
      color: var(--muted); font-size: .83rem; text-align: center;
      background: rgba(255,255,255,.4);
    }
    .file-upload-area:hover { border-color: var(--accent); background: rgba(79,114,255,.04); }
    .file-upload-area svg { width: 28px; height: 28px; color: var(--muted); }
    .file-name { color: var(--accent); font-weight: 600; }

    .remind-toggle { flex-direction: row; align-items: center; }
    .toggle-label {
      display: flex; align-items: center;
      justify-content: space-between; width: 100%;
      cursor: pointer; font-size: .9rem; color: var(--text); font-weight: 500;
    }
    .toggle-switch {
      width: 44px; height: 24px;
      background: rgba(26,39,68,.15); border-radius: 50px;
      position: relative; transition: background .2s; flex-shrink: 0;
    }
    .toggle-switch.active { background: var(--navy); }
    .toggle-knob {
      position: absolute; top: 3px; left: 3px;
      width: 18px; height: 18px;
      background: #fff; border-radius: 50%;
      transition: transform .2s;
      box-shadow: 0 1px 4px rgba(0,0,0,.2);
    }
    .toggle-switch.active .toggle-knob { transform: translateX(20px); }

    .modal-footer {
      display: flex; justify-content: flex-end; gap: 10px;
      padding: 16px 28px 24px;
      border-top: 1px solid rgba(26,39,68,.08);
    }
    .btn-cancel {
      background: rgba(26,39,68,.06);
      border: 1.5px solid rgba(26,39,68,.1);
      color: var(--sub);
      border-radius: 50px; padding: 9px 22px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .875rem; font-weight: 600;
      cursor: pointer; transition: background .2s, border-color .2s;
    }
    .btn-cancel:hover { background: rgba(26,39,68,.1); border-color: rgba(26,39,68,.2); }
    .btn-save {
      background: linear-gradient(135deg, var(--navy-mid), var(--navy));
      color: #fff; border: none;
      border-radius: 50px; padding: 9px 26px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .875rem; font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(26,39,68,.28);
      transition: transform .2s, box-shadow .2s;
    }
    .btn-save:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(26,39,68,.36); }

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