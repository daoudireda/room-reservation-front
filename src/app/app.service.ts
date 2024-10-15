import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { EventInput } from '@fullcalendar/core/index.js';
import { catchError, map, Observable, throwError } from 'rxjs';
import { AppEvent } from './appEvent.modal';

@Injectable({ providedIn: 'root' })
export class AppService {
  private httpClient = inject(HttpClient);
  private roomReservation = signal<AppEvent[]>([]);
  allEvents = this.roomReservation.asReadonly();
  private apiUrl = 'http://localhost:8080/api/reservations';

  private addEventToServer(eventData: AppEvent) {
    const prevEvents = [...this.roomReservation()];
    this.roomReservation.set([...prevEvents, eventData]);
    return this.httpClient
      .post(`${this.apiUrl}/addRoomReservation`, eventData)
      .pipe(
        catchError((error) => {
          this.roomReservation.set(prevEvents);
          return throwError(() => new Error('Failed to add event'));
        })
      )
      .subscribe((response) => {});
  }

  public addEvent(eventData: AppEvent) {
    this.addEventToServer(eventData); // Delegate the call to the server
  }

  getEventsFromServer(): Observable<EventInput[]> {
    return this.httpClient
      .get<AppEvent[]>(`${this.apiUrl}/getRoomReservations`)
      .pipe(
        map((events) => this.mapAppEventsToEventInput(events)),
        catchError((error) => {
          console.error('Failed to fetch events', error);
          return throwError(() => new Error('Failed to fetch events'));
        })
      );
  }

  // delete the event
  deleteEvent(id: string) {
    return this.httpClient
      .delete(`${this.apiUrl}/deleteRoomReservation/${Number(id)}`)
      .pipe(
        catchError((error) => {
          console.error('Failed to delete event', error);
          return throwError(() => new Error('Failed to delete event'));
        })
      );
  }

  

  private mapAppEventsToEventInput(appEvents: AppEvent[]): EventInput[] {
    return appEvents.map((appEvent) => ({
      id: appEvent.id,
      title: appEvent.title,
      start: appEvent.start ?? undefined,
      end: appEvent.end ?? undefined,
      allDay: false, // Set this based on your requirements
      // Add other optional properties as needed
      editable: true,
      // You can add more properties here as required by your application
    }));
  }
}
