import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component, inject,
  signal
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import {
  CalendarOptions,
  DateSelectArg,
  EventApi,
  EventClickArg,
  EventInput,
} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import { AppService } from './app.service';
import { createEventId } from './event-utils';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, FullCalendarModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  calendarVisible = signal(true);
  events: EventInput[] = [];
  roomReservation = signal<Partial<EventApi>[]>([]);
  currentEvents = signal<EventApi[]>([]);
  private appService = inject(AppService);
  constructor(private changeDetector: ChangeDetectorRef) {} // Store calendar-compatible events
  calendarOptions = signal<CalendarOptions>({
    plugins: [interactionPlugin, dayGridPlugin, timeGridPlugin, listPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
    },
    initialView: 'dayGridMonth',
  // alternatively, use the `events` setting to fetch from a feed
    weekends: true,
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleDeleteEvent.bind(this),
    eventsSet: this.handleEvents.bind(this),
    events: this.events,
    /* you can update a remote database when these fire:
    eventAdd:
    eventChange:
    eventRemove:
    */
  });

  ngOnInit() {
    this.fetchEventsFromServer();
  }

  // Fetch events from the server and update current events
  public fetchEventsFromServer() {
    this.appService.getEventsFromServer().subscribe(
      (mappedEvents) => {
        this.events = mappedEvents;
        this.updateCalendarEvents();
      },
      (error) => {
        console.error('Error loading events', error);
      }
    );
  }

  updateCalendarEvents() {
    this.calendarOptions.update((options) => ({
      ...options,
      events: this.events,
    }));
  }

  handleCalendarToggle() {
    this.calendarVisible.update((bool) => !bool);
  }

  handleWeekendsToggle() {
    this.calendarOptions.update((options) => ({
      ...options,
      weekends: !options.weekends,
    }));
  }

  handleDateSelect(selectInfo: DateSelectArg) {
    const title = prompt('Please enter a new title for your event');
    const calendarApi = selectInfo.view.calendar;

    calendarApi.unselect(); // clear date selection

    if (title) {
      this.addEventToCalendar(selectInfo, title);
      this.saveEventToServer(selectInfo, title);
    }
  }

  // Add an event to the calendar instance
  private addEventToCalendar(selectInfo: DateSelectArg, title: string) {
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect(); // Unselect date after adding event
    calendarApi.addEvent({
      id: createEventId(),
      title,
      start: selectInfo.start,
      end: selectInfo.endStr,
      allDay: selectInfo.allDay,
    });
  }

  // Save event data to the server
  private saveEventToServer(selectInfo: DateSelectArg, title: string) {
    this.appService.addEvent({
      id: createEventId(),
      title,
      start: selectInfo.start,
      end: selectInfo.end,
    });
  }

  handleDeleteEvent(clickInfo: EventClickArg) {
    if (confirm(`Are you sure you want to delete the event '${clickInfo.event.title}'`)) {
      this.appService.deleteEvent(clickInfo.event.id).subscribe(
        () => {
          clickInfo.event.remove();
        },
        (error) => console.error('Error deleting event', error)
      );
    }
  }


  handleEvents(events: EventApi[]) {
    this.currentEvents.set(events);
    events: this.events;
    this.changeDetector.detectChanges(); // workaround for pressionChangedAfterItHasBeenCheckedError
  }
}
