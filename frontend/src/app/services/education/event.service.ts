import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CalendarEvent } from '../../models/education/event.model';

@Injectable({ providedIn: 'root' })
export class EventService {

  private api = 'http://localhost:8080/api/events';

  constructor(private http: HttpClient) {}

  getAll(): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(this.api);
  }

  getById(id: number): Observable<CalendarEvent> {
    return this.http.get<CalendarEvent>(`${this.api}/${id}`);
  }

  getByUser(userId: number): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(`${this.api}/user/${userId}`);
  }

  getReminders(): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(`${this.api}/reminders`);
  }

  create(event: CalendarEvent): Observable<CalendarEvent> {
    return this.http.post<CalendarEvent>(this.api, event);
  }

  update(id: number, event: CalendarEvent): Observable<CalendarEvent> {
    return this.http.put<CalendarEvent>(`${this.api}/${id}`, event);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  uploadImage(eventId: number, file: File): Observable<CalendarEvent> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CalendarEvent>(`${this.api}/${eventId}/image`, formData);
  }
}