import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventSeat } from '../../models/education/event-seat.model';

@Injectable({
  providedIn: 'root'
})
export class EventSeatService {
  private apiUrl = `${environment.apiUrl}/api/event-seats`;

  constructor(private http: HttpClient) {}

  getSeatsByEvent(eventId: string): Observable<EventSeat[]> {
    return this.http.get<EventSeat[]>(`${this.apiUrl}/event/${eventId}`);
  }

  bookSeat(seatId: string, userId: number): Observable<EventSeat> {
    return this.http.post<EventSeat>(`${this.apiUrl}/${seatId}/book?userId=${userId}`, {});
  }

  bookSeats(seatIds: string[], userId: number): Observable<EventSeat[]> {
    return this.http.post<EventSeat[]>(`${this.apiUrl}/book-multiple?userId=${userId}`, seatIds);
  }

  cancelBooking(seatId: string, userId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${seatId}/cancel?userId=${userId}`, {});
  }

  cancelBookings(seatIds: string[], userId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/cancel-multiple?userId=${userId}`, seatIds);
  }

  getAttendees(eventId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/event/${eventId}/attendees`);
  }
}
