import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventSeat } from '../../models/education/event-seat.model';

@Injectable({
  providedIn: 'root'
})
export class EventSeatService {
  private apiUrl = 'http://localhost:8080/api/event-seats';

  constructor(private http: HttpClient) {}

  getSeatsByEvent(eventId: number): Observable<EventSeat[]> {
    return this.http.get<EventSeat[]>(`${this.apiUrl}/event/${eventId}`);
  }

  bookSeat(seatId: number, userId: number): Observable<EventSeat> {
    return this.http.post<EventSeat>(`${this.apiUrl}/${seatId}/book?userId=${userId}`, {});
  }

  bookSeats(seatIds: number[], userId: number): Observable<EventSeat[]> {
    return this.http.post<EventSeat[]>(`${this.apiUrl}/book-multiple?userId=${userId}`, seatIds);
  }

  cancelBooking(seatId: number, userId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${seatId}/cancel?userId=${userId}`, {});
  }
}
