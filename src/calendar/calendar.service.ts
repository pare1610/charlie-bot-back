import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);
  private calendar = google.calendar('v3');

  // Configuración de Auth (Esto requiere un archivo credentials.json de Google Console)
  private auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/calendar']
  );

  async checkAvailability(start: Date, end: Date): Promise<boolean> {
    const response = await this.calendar.freebusy.query({
      auth: this.auth,
      requestBody: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        items: [{ id: 'primary' }],
      },
    });

    const busy = response.data.calendars['primary'].busy;
    return busy.length === 0;
  }

  async createEvent(title: string, start: Date, end: Date) {
    return await this.calendar.events.insert({
      auth: this.auth,
      calendarId: 'primary',
      requestBody: {
        summary: title,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      },
    });
  }
}