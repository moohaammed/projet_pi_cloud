import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventSeatService } from '../../../services/education/event-seat.service';
import { AuthService } from '../../../services/auth.service';
import { EventSeat, SeatStatus } from '../../../models/education/event-seat.model';
import { CalendarEvent } from '../../../models/education/event.model';

@Component({
  selector: 'app-event-seat-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="seat-selection-overlay animate-fade-in" *ngIf="event">
      <div class="seat-selection-card shadow-lg rounded-4 overflow-hidden border-0">
        
        <div class="card-header bg-white border-0 p-4 d-flex justify-content-between align-items-center bg-soft-primary">
          <div>
            <h4 class="mb-1 fw-bold text-primary"><i class="fa-solid fa-chair me-2"></i> Réservation des places</h4>
            <p class="text-muted small mb-0">{{ event.title }} — {{ event.location }}</p>
          </div>
          <button class="btn-close-custom" (click)="close()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="card-body p-4 bg-white">
          
          <div class="d-flex justify-content-center gap-4 mb-5 legend">
            <div class="legend-item"><span class="box free"></span> <span class="label">Libre</span></div>
            <div class="legend-item"><span class="box booked"></span> <span class="label">Occupé</span></div>
            <div class="legend-item"><span class="box mine"></span> <span class="label">Ma place</span></div>
            <div class="legend-item"><span class="box selected"></span> <span class="label">Sélection</span></div>
          </div>

          <div class="seats-container" *ngIf="seats.length > 0">
            <div class="seats-grid" [style.grid-template-columns]="getGridColumns()">
              <button 
                *ngFor="let seat of seats" 
                class="seat-btn"
                [disabled]="isSeatDisabled(seat)"
                [class.free]="seat.status === 'FREE'"
                [class.booked]="isSomeoneElsesSeat(seat)"
                [class.mine]="isMySeat(seat)"
                [class.selected]="selectedSeat?.id === seat.id"
                (click)="toggleSelect(seat)"
                [title]="getSeatTooltip(seat)">
                <i class="fa-solid fa-chair"></i>
                <span class="seat-num">{{ seat.seatNumber }}</span>
              </button>
            </div>
          </div>

          <div class="empty-seats-state text-center py-5" *ngIf="seats.length === 0">
            <i class="fa-solid fa-chair fs-1 text-muted opacity-25 mb-3 d-block"></i>
            <p class="text-muted">Aucune place n'a été configurée pour cet événement.</p>
            <p class="small text-muted">Vérifiez la capacité de l'événement dans l'espace administration.</p>
          </div>

          <!-- Summary for Reservation -->
          <div class="booking-summary mt-5 p-4 rounded-4 bg-light border d-flex justify-content-between align-items-center animate-fade-in" *ngIf="selectedSeat && selectedSeat.status === 'FREE'">
            <div>
              <span class="text-muted small text-uppercase fw-bold d-block mb-1">Siège sélectionné</span>
              <div class="fs-4 fw-bold text-primary">
                <i class="fa-solid fa-chair me-2"></i> Place n°{{ selectedSeat.seatNumber }}
              </div>
            </div>
            <button class="btn btn-primary fw-bold rounded-pill px-5 py-2 shadow-sm" (click)="confirmBooking()" [disabled]="isLoading">
              <span *ngIf="!isLoading">Réserver cette place</span>
              <span *ngIf="isLoading"><i class="fa-solid fa-circle-notch fa-spin"></i></span>
            </button>
          </div>

          <!-- Summary for Cancellation -->
          <div class="booking-summary mt-5 p-4 rounded-4 border border-info bg-soft-info d-flex justify-content-between align-items-center animate-fade-in" *ngIf="selectedSeat && isMySeat(selectedSeat)">
            <div>
              <span class="text-info small text-uppercase fw-bold d-block mb-1">Votre place</span>
              <div class="fs-4 fw-bold text-info">
                <i class="fa-solid fa-circle-check me-2"></i> Place n°{{ selectedSeat.seatNumber }}
              </div>
            </div>
            <button class="btn btn-outline-danger fw-bold rounded-pill px-4 py-2" (click)="cancelBooking(selectedSeat)" [disabled]="isLoading">
              <span *ngIf="!isLoading"><i class="fa-solid fa-xmark me-2"></i> Annuler cette réservation</span>
              <span *ngIf="isLoading"><i class="fa-solid fa-circle-notch fa-spin"></i></span>
            </button>
          </div>

        </div>

        <div class="card-footer bg-white border-top p-3 text-center">
          <button class="btn btn-link text-muted text-decoration-none fw-bold" (click)="close()">Fermer</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .seat-selection-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(8px);
      z-index: 1050;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .seat-selection-card {
      background: white; width: 100%; max-width: 800px;
      max-height: 90vh; overflow-y: auto;
    }
    .btn-close-custom {
      background: white; border: none; width: 40px; height: 40px;
      border-radius: 50%; color: #64748b; transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .btn-close-custom:hover { transform: scale(1.1); color: #ef4444; }

    .legend { font-size: 14px; }
    .legend-item { display: flex; align-items: center; gap: 8px; }
    .box { width: 16px; height: 16px; border-radius: 4px; display: inline-block; }
    
    .free { background: #d1fae5 !important; border: 2px solid #10b981 !important; }
    .booked { background: #fee2e2 !important; border: 2px solid #ef4444 !important; }
    .mine { background: #dbeafe !important; border: 2px solid #3b82f6 !important; }
    .selected { background: #f3e8ff !important; border: 2px solid #800080 !important; }

    .seats-container {
      display: flex; justify-content: center;
      padding: 20px;
      background: #f8fafc;
      border-radius: 12px;
    }
    .seats-grid {
      display: grid;
      gap: 12px;
    }
    .seat-btn {
      width: 44px; height: 44px;
      border-radius: 10px;
      border: 2px solid transparent;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s;
      position: relative;
    }
    .seat-btn i { font-size: 16px; margin-bottom: 2px; }
    .seat-btn .seat-num { font-size: 10px; font-weight: 800; }

    .seat-btn.free { background: #d1fae5 !important; border-color: #10b981 !important; color: #065f46 !important; }
    .seat-btn.free:hover { background: #a7f3d0 !important; transform: translateY(-2px); }
    
    .seat-btn.booked { background: #fee2e2 !important; border-color: #fecaca !important; color: #991b1b !important; cursor: not-allowed; }
    
    .seat-btn.mine { background: #dbeafe !important; border-color: #bfdbfe !important; color: #1e40af !important; cursor: default; }
    
    .seat-btn.selected { background: #f3e8ff !important; border: 3px solid #800080 !important; color: #800080 !important; transform: scale(1.1); font-weight: bold; }

    .bg-soft-primary { background-color: #f3f0ff !important; }

    .animate-fade-in {
      animation: fadeIn 0.3s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class EventSeatGridComponent implements OnInit {
  @Input() event: CalendarEvent | null = null;
  @Output() closed = new EventEmitter<void>();

  seats: EventSeat[] = [];
  selectedSeat: EventSeat | null = null;
  currentUser: any = null;
  isLoading = false;

  constructor(
    private seatService: EventSeatService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    if (this.event?.id) {
      this.loadSeats();
    }
  }

  loadSeats() {
    if (!this.event?.id) return;
    this.seatService.getSeatsByEvent(this.event.id).subscribe(data => {
      this.seats = data;
    });
  }

  checkIfAlreadyBooked() {
    // Plus besoin de bloquer, mais on pourrait garder un indicateur visuel général si besoin
  }

  getGridColumns() {
    // Calculer le nombre de colonnes (racine carrée ou fixe à 10)
    const count = this.seats.length || 20;
    const cols = Math.ceil(Math.sqrt(count));
    return `repeat(${cols > 10 ? 10 : cols}, 1fr)`;
  }

  isSeatDisabled(seat: EventSeat): boolean {
    // On ne désactive que si c'est quelqu'un d'autre
    return this.isSomeoneElsesSeat(seat);
  }

  isSomeoneElsesSeat(seat: EventSeat): boolean {
    if (seat.status !== SeatStatus.BOOKED) return false;
    return !this.isMySeat(seat);
  }

  isMySeat(seat: EventSeat): boolean {
    if (!seat.bookedBy || !this.currentUser) return false;
    // Comparaison d'ID robuste
    return String(seat.bookedBy.id) === String(this.currentUser.id);
  }

  getSeatTooltip(seat: EventSeat): string {
    if (this.isMySeat(seat)) return 'C’est votre place !';
    if (seat.status === SeatStatus.BOOKED) return `Occupé par ${seat.bookedBy?.prenom || 'un utilisateur'}`;
    return `Place n°${seat.seatNumber} (Libre)`;
  }

  toggleSelect(seat: EventSeat) {
    if (this.isSeatDisabled(seat)) return;
    this.selectedSeat = (this.selectedSeat?.id === seat.id) ? null : seat;
  }

  confirmBooking() {
    if (!this.selectedSeat || !this.currentUser?.id) return;
    
    this.isLoading = true;
    this.seatService.bookSeat(this.selectedSeat.id, this.currentUser.id).subscribe({
      next: () => {
        this.isLoading = false;
        this.selectedSeat = null;
        this.loadSeats();
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.message || err.error || 'Erreur lors de la réservation';
        alert(msg);
      }
    });
  }

  cancelBooking(seat: EventSeat) {
    if (!this.currentUser?.id) return;
    
    if (confirm(`Voulez-vous vraiment annuler votre réservation pour la place n°${seat.seatNumber} ?`)) {
      this.isLoading = true;
      this.seatService.cancelBooking(seat.id, this.currentUser.id).subscribe({
        next: () => {
          this.isLoading = false;
          this.selectedSeat = null;
          this.loadSeats();
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err.error?.message || err.error || 'Erreur lors de l’annulation';
          alert(msg);
        }
      });
    }
  }

  close() {
    this.closed.emit();
  }
}
