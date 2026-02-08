import { Controller, Get, Query, Redirect, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  /**
   * GET /auth/login
   * Inicia el flujo de autenticación OAuth
   */
  @Get('login')
  @Redirect()
  login() {
    const authUrl = this.authService.getAuthUrl();
    this.logger.log('🔗 Enviando usuario a Google OAuth...');
    return { url: authUrl };
  }

  /**
   * GET /auth/callback
   * Callback de Google OAuth - será llamado después de que el usuario autorice
   */
  @Get('callback')
  async callback(@Query('code') code: string, @Query('error') error: string) {
    if (error) {
      this.logger.error('Error en autenticación:', error);
      return {
        success: false,
        message: `Error: ${error}`,
        instruction: 'Por favor, intenta de nuevo visitando /auth/login',
      };
    }

    if (!code) {
      return {
        success: false,
        message: 'No se recibió código de autenticación',
        instruction: 'Por favor, intenta de nuevo visitando /auth/login',
      };
    }

    try {
      await this.authService.exchangeCodeForToken(code);
      return {
        success: true,
        message: '✅ ¡Autenticación exitosa!',
        instruction: 'Ya puedes cierre esta ventana y el bot iniciará funcionando automáticamente.',
      };
    } catch (error) {
      this.logger.error('Error intercambiando código:', error);
      return {
        success: false,
        message: 'Error durante la autenticación',
        error: error.message,
        instruction: 'Por favor, intenta de nuevo visitando /auth/login',
      };
    }
  }

  /**
   * GET /auth/status
   * Verifica el estado de autenticación
   */
  @Get('status')
  status() {
    const isAuthenticated = this.authService.isAuthenticated();
    return {
      authenticated: isAuthenticated,
      message: isAuthenticated
        ? '✅ Estás autenticado. El bot puede enviar invitaciones.'
        : '❌ No estás autenticado. Visita /auth/login para autenticarte.',
    };
  }
}
