import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface EventData {
  title: string;
  start: Date;
  end: Date;
  attendeeEmail: string;
  attendeeName: string;
  attendeePhone: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: any;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPassword = this.configService.get<string>('EMAIL_PASSWORD');

    if (!emailUser || !emailPassword) {
      this.logger.warn('EMAIL_USER o EMAIL_PASSWORD no configurados. Servicio de correo deshabilitado.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });
  }

  async sendEventConfirmation(eventData: EventData): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('No hay transporter configurado. No se enviará correo de confirmación.');
      return;
    }

    try {
      const eventDate = eventData.start.toLocaleString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const mailOptions = {
        from: this.configService.get<string>('EMAIL_USER'),
        to: eventData.attendeeEmail,
        subject: `✅ Cita Agendada - ${eventData.attendeeName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">¡Tu cita ha sido agendada! 🎊</h2>
            
            <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #27ae60; margin-top: 0;">Detalles de tu cita:</h3>
              <p><strong>Nombre:</strong> ${eventData.attendeeName}</p>
              <p><strong>Teléfono:</strong> ${eventData.attendeePhone}</p>
              <p><strong>Correo:</strong> ${eventData.attendeeEmail}</p>
              <p><strong>Fecha y Hora:</strong> ${eventDate}</p>
              <p><strong>Duración:</strong> ${this.calculateDuration(eventData.start, eventData.end)}</p>
            </div>

            <p style="color: #7f8c8d; margin-top: 20px;">
              Este es un correo de confirmación enviado automáticamente por Charlie Bot. 
              Si tienes preguntas, por favor contacta dirección de atención al cliente.
            </p>

            <footer style="border-top: 1px solid #ecf0f1; padding-top: 10px; margin-top: 20px; color: #95a5a6; font-size: 12px;">
              <p>© 2026 Charlie Bot. Todos los derechos reservados.</p>
            </footer>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Correo de confirmación enviado a: ${eventData.attendeeEmail}`);
    } catch (error) {
      this.logger.error('Error enviando correo de confirmación:', error.message);
      // No propagar el error para no afectar el flujo principal
    }
  }

  private calculateDuration(start: Date, end: Date): string {
    const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
      return `${hours} hora${hours > 1 ? 's' : ''} y ${mins} minuto${mins > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hora${hours > 1 ? 's' : ''}`;
    } else {
      return `${mins} minuto${mins > 1 ? 's' : ''}`;
    }
  }
}
