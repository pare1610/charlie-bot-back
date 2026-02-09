import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CalendarService {
  private calendar = google.calendar('v3');
  private logger = new Logger(CalendarService.name);
  private auth: any = null;
  private serviceAccountEmail?: string;
  private calendarId: string;

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private emailService: EmailService,
  ) {
    const calId = this.configService.get<string>('GOOGLE_CALENDAR_ID');

    if (!calId) {
      throw new Error('GOOGLE_CALENDAR_ID es requerido');
    }

    this.calendarId = calId;

    // Intentar cargar credenciales de cuenta de servicio si existe el archivo
    try {
      const defaultSaPath = path.join(process.cwd(), 'auth_info', 'service-account.json');
      const saFile = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_FILE') || defaultSaPath;
      if (fs.existsSync(saFile)) {
        const content = fs.readFileSync(saFile, 'utf8');
        const parsed = JSON.parse(content);
        const serviceAccountEmail = parsed.client_email;
        const privateKey = parsed.private_key;
        if (serviceAccountEmail && privateKey) {
          this.auth = new google.auth.JWT({
            email: serviceAccountEmail,
            key: privateKey,
            scopes: ['https://www.googleapis.com/auth/calendar'],
          });
          this.serviceAccountEmail = serviceAccountEmail;
          this.logger.log('Usando credenciales de cuenta de servicio:', serviceAccountEmail);
        }
      }
    } catch (err: any) {
      this.logger.warn('No se pudo cargar la cuenta de servicio:', err?.message || err);
    }
  }

  async checkAvailability(start: Date, end: Date): Promise<boolean> {
    // Si hay auth de cuenta de servicio, úsala primero
    if (this.auth) {
      try {
        const response = await this.calendar.freebusy.query({
          auth: this.auth,
          requestBody: {
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
            items: [{ id: this.calendarId }],
          },
        });

        const busy = response.data.calendars?.[this.calendarId]?.busy || [];
        return busy.length === 0;
      } catch (err: any) {
        const msg = err?.response?.data || err?.message || err;
        this.logger.error('Error checkAvailability con cuenta de servicio:', msg);
        // Si la cuenta de servicio no tiene acceso al calendario, propagar un mensaje claro
        if (this.serviceAccountEmail) {
          throw new Error(
            `La cuenta de servicio ${this.serviceAccountEmail} no tiene acceso al calendario ${this.calendarId}. Comparte tu calendario con esa cuenta y dale permisos para "Hacer cambios en los eventos".`,
          );
        }
        throw err;
      }
    }

    // Si no hay cuenta de servicio, usar OAuth2
    if (!this.authService.isAuthenticated()) {
      this.logger.warn('Intento de verificación de disponibilidad sin estar autenticado.');
      throw new Error(
        'Usuario no autenticado. Por favor, accede a http://localhost:3000/auth/login',
      );
    }

    try {
      await this.authService.refreshTokenIfNeeded();
      const response = await this.calendar.freebusy.query({
        auth: this.authService.getOAuth2Client(),
        requestBody: {
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          items: [{ id: this.calendarId }],
        },
      });

      const busy = response.data.calendars?.[this.calendarId]?.busy || [];
      return busy.length === 0;
    } catch (error: any) {
      this.logger.error('Error verificando disponibilidad (OAuth):', error?.message || error);
      throw error;
    }
  }

  async createEvent(
    title: string,
    start: Date,
    end: Date,
    attendeeEmail: string,
    phoneNumber: string,
    attendeeName: string,
  ) {
    let eventCreated: any = null;

    // Si hay cuenta de servicio, intentar con ella primero
    if (this.auth) {
      try {
        eventCreated = await this.calendar.events.insert({
          auth: this.auth,
          calendarId: this.calendarId,
          requestBody: {
            summary: title,
            description: `Agendado vía Charlie Bot WhatsApp\nNombre: ${attendeeName}\nCorreo: ${attendeeEmail}\nTeléfono: ${phoneNumber}`,
            start: { dateTime: start.toISOString() },
            end: { dateTime: end.toISOString() },
            conferenceData: { createRequest: { requestId: Date.now().toString() } },
          },
        });
      } catch (err: any) {
        const reason = err?.response?.data?.error?.errors?.[0]?.reason || err?.message || '';
        this.logger.error('Error creando evento con cuenta de servicio:', reason);
        throw err;
      }
    } else {
      // Si no hay cuenta de servicio, usar OAuth2
      if (!this.authService.isAuthenticated()) {
        throw new Error(
          'Usuario no autenticado. Por favor, accede a http://localhost:3000/auth/login',
        );
      }

      try {
        await this.authService.refreshTokenIfNeeded();
        eventCreated = await this.calendar.events.insert({
          auth: this.authService.getOAuth2Client(),
          calendarId: this.calendarId,
          requestBody: {
            summary: title,
            description: `Agendado vía Charlie Bot WhatsApp\nNombre: ${attendeeName}\nCorreo: ${attendeeEmail}\nTeléfono: ${phoneNumber}`,
            start: { dateTime: start.toISOString() },
            end: { dateTime: end.toISOString() },
            conferenceData: { createRequest: { requestId: Date.now().toString() } },
          },
        });
      } catch (error: any) {
        this.logger.error('Error creando evento (OAuth):', error?.message || error);
        throw error;
      }
    }

    // Enviar correo de confirmación
    if (eventCreated) {
      await this.emailService.sendEventConfirmation({
        title,
        start,
        end,
        attendeeEmail,
        attendeeName,
        attendeePhone: phoneNumber,
      });
    }

    return eventCreated;
  }
}
