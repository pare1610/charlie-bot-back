import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  WASocket,
  proto 
} from '@whiskeysockets/baileys';
import * as qrcode from 'qrcode-terminal';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private sock: WASocket;
  private readonly logger = new Logger('WhatsappService');
  private userState = new Map<string, string>(); // Para manejar los estados de cada usuario

  // Este método se ejecuta automáticamente cuando el servidor arranca
  async onModuleInit() {
    this.startBot();
  }

  async startBot() {
    this.logger.log('🔄 Iniciando conexión con WhatsApp...');
    
    // Guardará la sesión en la carpeta "auth_info"
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // Lo imprimiremos nosotros manualmente
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.logger.log('📲 ESCANEA EL QR PARA VINCULAR:');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
        this.logger.warn(`❌ Conexión cerrada. Reconectando: ${shouldReconnect}`);
        if (shouldReconnect) this.startBot();
      } else if (connection === 'open') {
        this.logger.log('✅ ¡Bot conectado y listo!');
      }
    });

    // Escuchar mensajes entrantes
    this.sock.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify') return;
      
      for (const msg of m.messages) {
        if (!msg.key.fromMe) {
          await this.procesarMensajeLocal(msg);
        }
      }
    });
  }

  // Aquí movemos la lógica que tenías en handlers.js
  private async procesarMensajeLocal(msg: proto.IWebMessageInfo) {
    // 1. Extraemos con seguridad usando '?'
    const remoteJid = msg.key?.remoteJid;
    
    // 2. Usamos una función auxiliar para sacar el texto (como hacías en handlers.js)
    const text = this.getTextFromMessage(msg);

    // 3. Validación de seguridad: Si no hay quién envíe o qué decir, ignoramos
    if (!remoteJid || !text) return;

    this.logger.log(`📩 Mensaje de ${remoteJid}: ${text}`);

    // ... resto de tu lógica de respuestas
    // ... dentro de procesarMensajeLocal ...

const state = this.userState.get(remoteJid);

if (text === '2') {
    this.userState.set(remoteJid, 'AWAITING_DATE');
    await this.sock.sendMessage(remoteJid, { 
        text: '📅 Por favor, indica la fecha y hora de la reunión (Ejemplo: 2024-12-01 15:00)' 
    });
} 
else if (state === 'AWAITING_DATE') {
    const fechaInicio = new Date(text);
    const fechaFin = new Date(fechaInicio.getTime() + 60 * 60 * 1000); // 1 hora después

    if (isNaN(fechaInicio.getTime())) {
        await this.sock.sendMessage(remoteJid, { text: '❌ Formato inválido. Usa: AAAA-MM-DD HH:MM' });
        return;
    }

    // Aquí llamamos al servicio de calendario
    const disponible = await this.calendarService.checkAvailability(fechaInicio, fechaFin);

    if (disponible) {
        await this.calendarService.createEvent('Reunión con Cliente WA', fechaInicio, fechaFin);
        this.userState.delete(remoteJid);
        await this.sock.sendMessage(remoteJid, { text: '✅ ¡Reunión agendada con éxito!' });
    } else {
        await this.sock.sendMessage(remoteJid, { text: '🚫 Lo siento, esa hora ya está ocupada. Intenta con otra.' });
    }
}
  }

  // Función auxiliar robusta para extraer texto de cualquier tipo de mensaje de WA
  private getTextFromMessage(msg: proto.IWebMessageInfo): string {
    if (!msg.message) return "";

    return (
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.ephemeralMessage?.message?.extendedTextMessage?.text ||
      msg.message.ephemeralMessage?.message?.conversation ||
      ""
    );
  }
}