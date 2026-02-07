import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CalendarService {
  private calendar = google.calendar('v3');
  private logger = new Logger(CalendarService.name);
  private auth: any;

  constructor(private configService: ConfigService) {
    this.auth = new google.auth.JWT(
      this.configService.get('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
      null,
      this.configService.get('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/calendar']
    );
  }

  async checkAvailability(start: Date, end: Date): Promise<boolean> {
    try {
      const response = await this.calendar.freebusy.query({
        auth: this.auth,
        requestBody: {
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          items: [{ id: 'primary' }],
        },
      });
      const busy = response.data.calendars['primary'].busy || [];
      return busy.length === 0;
    } catch (error) {
      this.logger.error('Error checking availability', error);
      return false;
    }
  }

  async createEvent(title: string, start: Date, end: Date, attendeeEmail: string) {
    return await this.calendar.events.insert({
      auth: this.auth,
      calendarId: 'primary',
      requestBody: {
        summary: title,
        description: 'Agendado vía Charlie Bot WhatsApp',
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees: [{ email: attendeeEmail }],
      },
    });
  }
}