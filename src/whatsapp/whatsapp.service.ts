import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, WASocket, proto } from '@whiskeysockets/baileys';
import * as qrcode from 'qrcode-terminal';
import * as chrono from 'chrono-node';
import { CalendarService } from '../calendar/calendar.service';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private sock: WASocket;
  private readonly logger = new Logger('WhatsappService');
  
  // Memoria temporal para estados y datos
  private userState = new Map<string, string>();
  private tempData = new Map<string, any>();

  constructor(private calendarService: CalendarService) {}

  async onModuleInit() {
    this.startBot();
  }

  async startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    this.sock = makeWASocket({ auth: state });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) qrcode.generate(qr, { small: true });
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) this.startBot();
      } else if (connection === 'open') {
        this.logger.log('✅ Bot de WhatsApp Online');
      }
    });

    this.sock.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify') return;
      for (const msg of m.messages) {
        if (!msg.key.fromMe) await this.handleMessages(msg);
      }
    });
  }

  private async handleMessages(msg: proto.IWebMessageInfo) {
    const jid = msg.key?.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
    if (!jid || !text) return;

    const state = this.userState.get(jid);
    const lowerText = text.toLowerCase();

    // MENU PRINCIPAL
    if (lowerText === 'hola' || lowerText === 'menu') {
      this.userState.set(jid, 'MAIN_MENU');
      await this.sock.sendMessage(jid, { text: '🤖 *Charlie Bot*\n1. Ver pedidos\n2. Agendar Cita\n3. Contacto' });
      return;
    }

    // FLUJO DE AGENDAMIENTO
    if (text === '2' && state === 'MAIN_MENU') {
      this.userState.set(jid, 'AWAITING_DATE');
      await this.sock.sendMessage(jid, { text: '📅 ¿Para cuándo quieres la cita?\n_(Ej: "Mañana a las 10am" o "El lunes a las 3pm")_' });
    } 
    
    else if (state === 'AWAITING_DATE') {
      const parsed = chrono.parse(text, new Date(), { forwardDate: true });
      if (parsed.length === 0) {
        await this.sock.sendMessage(jid, { text: '❌ No entendí la fecha. Intenta de nuevo.' });
        return;
      }

      const start = parsed[0].start.date();
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hora

      let isOk = false;
      try {
        isOk = await this.calendarService.checkAvailability(start, end);
      } catch (err: any) {
        const reason = err?.message || '';
        this.logger.error('Error verificando disponibilidad:', reason);
        if (reason.includes('Usuario no autenticado') || reason.includes('/auth/login')) {
          await this.sock.sendMessage(jid, { text: '⚠️ El bot no está autenticado con Google Calendar. Por favor autoriza visitando: http://localhost:3000/auth/login' });
          return;
        }
        await this.sock.sendMessage(jid, { text: '❌ Error verificando disponibilidad. Intenta más tarde.' });
        return;
      }

      if (isOk) {
        this.tempData.set(jid, { start, end });
        this.userState.set(jid, 'AWAITING_NAME');
        await this.sock.sendMessage(jid, { text: `✅ Disponible para: *${start.toLocaleString()}*\n\n¿A nombre de quién agendamos?` });
      } else {
        await this.sock.sendMessage(jid, { text: '🚫 Ese horario ya está ocupado. Prueba con otro.' });
      }
    }

    else if (state === 'AWAITING_NAME') {
      const data = this.tempData.get(jid);
      this.tempData.set(jid, { ...data, name: text });
      this.userState.set(jid, 'AWAITING_EMAIL');
      await this.sock.sendMessage(jid, { text: '📧 Por último, escribe tu correo electrónico:' });
    }

    else if (state === 'AWAITING_EMAIL') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(text)) {
        await this.sock.sendMessage(jid, { text: '❌ Por favor, escribe un correo electrónico válido.\n_(Ej: usuario@ejemplo.com)_' });
        return;
      }

      // Extraer número telefónico del JID (formato: "573168641671@s.whatsapp.net")
      const phoneNumber = jid.split('@')[0];

      const data = this.tempData.get(jid);
      try {
        await this.calendarService.createEvent(
          `Cita: ${data.name}`,
          data.start,
          data.end,
          text,
          phoneNumber,
          data.name,
        );
        
        this.userState.delete(jid);
        this.tempData.delete(jid);
        await this.sock.sendMessage(jid, { text: `🎊 ¡Listo! Cita agendada para: *${data.start.toLocaleString()}*\n\n📧 Datos registrados:\n• Nombre: ${data.name}\n• Correo: ${text}\n• Teléfono: ${phoneNumber}\n\n✅ El evento se creó en el calendario. Se envió una confirmación a tu correo.` });
      } catch (error) {
        this.logger.error('Error al crear evento:', error);
        this.userState.delete(jid);
        this.tempData.delete(jid);
        await this.sock.sendMessage(jid, { text: '❌ Error al agendar la cita. Por favor, intenta más tarde.' });
      }
    }
  }
}