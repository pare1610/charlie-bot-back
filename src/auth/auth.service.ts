import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { OAuth2Client } from 'google-auth-library';

const TOKEN_PATH = path.join(process.cwd(), 'auth_info', 'oauth-token.json');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private oauth2Client: OAuth2Client;

  constructor(private configService: ConfigService) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUrl = this.configService.get<string>('GOOGLE_REDIRECT_URL') || 'http://localhost:3000/auth/callback';

    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET son requeridos para OAuth');
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUrl,
    );

    // Intenta cargar el token existente
    this.loadToken();
  }

  /**
   * Carga el token guardado si existe
   */
  private loadToken(): void {
    try {
      if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        this.oauth2Client.setCredentials(token);
        this.logger.log('✅ Token OAuth cargado correctamente');
      }
    } catch (error) {
      this.logger.warn('No se encontró token OAuth. Necesita autenticar primero.');
    }
  }

  /**
   * Genera la URL de autenticación para que el usuario autorice
   */
  getAuthUrl(): string {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
    });
    return authUrl;
  }

  /**
   * Intercambia el código de autorización por un token
   */
  async exchangeCodeForToken(code: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Guarda el token para uso futuro
      this.saveToken(tokens);
      this.logger.log('✅ Token obtenido y guardado exitosamente');
    } catch (error) {
      this.logger.error('Error al obtener token:', error.message);
      throw new Error('Error durante la autenticación con Google');
    }
  }

  /**
   * Guarda el token en archivo
   */
  private saveToken(token: any): void {
    const tokenDir = path.dirname(TOKEN_PATH);
    if (!fs.existsSync(tokenDir)) {
      fs.mkdirSync(tokenDir, { recursive: true });
    }
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
  }

  /**
   * Obtiene el cliente OAuth2 configurado
   */
  getOAuth2Client(): OAuth2Client {
    return this.oauth2Client;
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    const credentials = this.oauth2Client.credentials;
    return !!(credentials && credentials.access_token);
  }

  /**
   * Refresca el token si es necesario
   */
  async refreshTokenIfNeeded(): Promise<void> {
    try {
      const credentials = this.oauth2Client.credentials;
      if (credentials && credentials.expiry_date && credentials.expiry_date < Date.now()) {
        this.logger.log('🔄 Token expirado, refrescando...');
        const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(newCredentials);
        this.saveToken(newCredentials);
        this.logger.log('✅ Token refrescado');
      }
    } catch (error) {
      this.logger.error('Error refrescando token:', error.message);
    }
  }
}
