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
      --primary:      #800080;
      --primary-light:#f5e6f5;
      --primary-mid:  #e8c8e8;
      --primary-hover:#660066;
      --primary-dark: #4d004d;
      --white:        #ffffff;
      --bg:           #fdf5fd;
      --card-bg:      #ffffff;
      --border:       #e0c8e0;
      --text-dark:    #2e152e;
      --text-mid:     #6b3e6b;
      --text-light:   #b07ab0;
      --shadow:       0 2px 16px rgba(128, 0, 128, 0.08);
      --shadow-card:  0 4px 24px rgba(128, 0, 128, 0.10);
      --radius:       16px;
      --radius-sm:    10px;
      display: block;
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: #ffffff !important;
    }

    .events-page {
      background: #ffffff !important;
      min-height: 100vh;
      padding: 20px 32px 40px;
    }

    

 
    .page-header {
      position: relative;
      background: linear-gradient(135deg, rgba(128,0,128,0.06) 0%, rgba(128,0,128,0.01) 100%) !important;
      border: 1px solid rgba(128,0,128,0.08);
      border-radius: var(--radius);
      padding: 45px 30px !important;
      margin-bottom: 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .page-header::before {
      content: '';
      position: absolute;
      top: -50px; left: -50px;
      width: 150px; height: 150px;
      background: var(--primary-light);
      filter: blur(40px);
      border-radius: 50%;
      opacity: 0.6;
      z-index: 0;
    }

    .page-header::after {
      content: '';
      position: absolute;
      bottom: -40px; right: 10%;
      width: 120px; height: 120px;
      background: var(--primary-mid);
      filter: blur(40px);
      border-radius: 50%;
      opacity: 0.3;
      z-index: 0;
    }

    .title-container {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .header-badge {
      display: inline-block;
      padding: 6px 14px;
      background: var(--white);
      color: var(--primary-dark);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border-radius: 50px;
      border: 1px solid var(--primary-light);
      box-shadow: 0 4px 12px rgba(128,0,128,0.05);
      margin-bottom: 4px;
    }

    .page-title {
      font-family: 'Fraunces', serif;
      font-size: 3.2rem;
      font-weight: 800;
      color: var(--text-dark);
      background: linear-gradient(to right, var(--text-dark), var(--primary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
      line-height: 1.1;
      letter-spacing: -.02em;
    }

    .page-subtitle {
      font-size: 1.1rem;
      color: var(--text-mid);
      margin: 0;
      max-width: 600px;
      line-height: 1.5;
    }

    .controls-row {
      display: flex;
      align-items: center;
      margin-bottom: 30px;
      position: relative;
      z-index: 2;
      min-height: 50px;
    }

    .search-box {
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: 50px;
      padding: 12px 20px 12px 42px;
      box-shadow: 0 8px 30px rgba(128, 0, 128, 0.06);
      transition: all 0.3s ease;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      width: 100%;
      max-width: 450px;
    }
    .search-box:focus-within { 
      border-color: var(--primary);
      box-shadow: 0 8px 30px rgba(128, 0, 128, 0.12);
      transform: translateX(-50%) translateY(-2px);
    }

    .search-icon {
      position: absolute; left: 16px;
      width: 18px; height: 18px;
      color: var(--text-light);
      pointer-events: none;
    }

    .search-input {
      background: transparent;
      border: none;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: .95rem;
      color: var(--text-dark);
      outline: none;
      width: 100%;
    }
    .search-input::placeholder { color: var(--text-light); }

    .stats-bar {
      display: inline-flex;
      align-items: center;
      gap: 0;
      background: var(--white);
      border: 1.5px solid var(--border);
      border-radius: 50px;
      padding: 6px 6px;
      margin-bottom: 22px;
      box-shadow: var(--shadow);
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 20px;
    }

    .stat-icon {
      width: 32px; height: 32px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon.total,
    .stat-icon.upcoming { background: var(--primary-light); color: var(--primary); }
    .stat-icon.past     { background: #f0eded; color: var(--text-light); }
    .stat-icon svg { width: 14px; height: 14px; }

    .stat-info { display: flex; flex-direction: column; }
    .stat-number {
      font-family: 'Fraunces', serif;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-dark);
      line-height: 1;
    }
    .stat-label {
      font-size: .7rem;
      color: var(--text-mid);
      font-weight: 500;
      margin-top: 1px;
    }
    .stat-divider { width: 1px; height: 28px; background: var(--border); }

    .events-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 22px;
    }

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
      box-shadow: 0 12px 36px rgba(128, 0, 128, 0.15);
      transform: translateY(-4px);
    }
    .event-card:hover .card-image { transform: scale(1.06); }

    .card-image-wrapper {
      position: relative;
      height: 195px;
      overflow: hidden;
      background: var(--primary-mid);
    }
    .card-image {
      width: 100%; height: 100%;
      object-fit: cover;
      transition: transform .45s ease;
    }
    .card-image-wrapper::after {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(to top, rgba(46,21,46,.3) 0%, transparent 55%);
      pointer-events: none;
    }

    .card-badge {
      position: absolute;
      top: 12px; left: 12px;
      z-index: 1;
      padding: 4px 12px;
      border-radius: 50px;
      font-size: .65rem;
      font-weight: 700;
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    .card-badge.upcoming { background: var(--primary); color: var(--white); }
    .card-badge.past     { background: rgba(0,0,0,.42); color: var(--white); }

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
      font-size: .68rem;
      font-weight: 600;
      background: var(--primary-light);
      color: var(--primary-dark);
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

    .card-separator { height: 1px; background: var(--border); margin-top: auto; }

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
    .card-location svg { width: 13px; height: 13px; flex-shrink: 0; color: var(--primary); }
    .card-location span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .card-remind {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: .7rem;
      font-weight: 700;
      color: var(--primary-dark);
      background: var(--primary-light);
      padding: 3px 10px;
      border-radius: 50px;
      white-space: nowrap;
    }
    .card-remind svg { width: 11px; height: 11px; }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 44px;
    }

    .page-btn {
      min-width: 40px; height: 40px;
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
      border-color: var(--primary);
      color: var(--primary);
      transform: translateY(-1px);
    }
    .page-btn.active {
      background: var(--primary);
      border-color: var(--primary);
      color: var(--white);
      font-weight: 700;
    }
    .page-btn:disabled { opacity: .4; cursor: not-allowed; }

    .empty-state {
      display: flex; flex-direction: column;
      align-items: center;
      padding: 90px 20px;
      gap: 14px;
      text-align: center;
    }
    .empty-glass {
      width: 120px; height: 120px;
      border-radius: 30px;
      background: var(--primary-light);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 8px;
    }
    .empty-glass svg { width: 52px; height: 52px; color: var(--primary); }
    .empty-title {
      font-family: 'Fraunces', serif;
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text-dark);
      margin: 0;
    }
    .empty-sub { font-size: .88rem; color: var(--text-light); margin: 0; }

    @media (max-width: 1100px) {
      .events-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 900px) {
      .controls-row {
        flex-direction: column;
        align-items: center;
        gap: 15px;
        min-height: auto;
      }
      .search-box {
        position: relative;
        left: 0;
        transform: none;
        max-width: 100%;
      }
      .search-box:focus-within { transform: translateY(-2px); }
    }
    @media (max-width: 640px) {
      .events-page { padding: 24px 18px 56px; }
      .page-title  { font-size: 2rem; }
      .events-grid { grid-template-columns: 1fr; }
      .header-right { width: 100%; }
      .search-input { width: 100%; }
    }
  `]
})
export class EventFrontComponent implements OnInit {

  events: CalendarEvent[] = [];
  searchQuery = '';
  currentPage = 1;
  pageSize = 6;

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
}