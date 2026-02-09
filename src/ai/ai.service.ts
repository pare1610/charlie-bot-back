import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private groq: Groq;

  constructor(private configService: ConfigService) {
    this.groq = new Groq({
      apiKey: this.configService.get('GROQ_API_KEY'),
    });
  }

  async getAiResponse(prompt: string, userName: string): Promise<string> {
    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `Eres Charlie, el asistente inteligente de Proelectricos. 
            Tu tono es profesional, amable y conciso. 
            Saluda a ${userName} si es la primera vez. 
            Si el usuario quiere agendar, dile que use la opción 2 del menú.
            Si quiere ver pedidos, dile que use la opción 1.`,
          },
          { role: 'user', content: prompt },
        ],
        model: 'llama-3.3-70b-versatile', // Modelo más potente disponible en Groq
      });

      return completion.choices[0]?.message?.content || 'Lo siento, tuve un pequeño corto circuito mental. ¿Me repites?';
    } catch (error) {
      console.error('Error en servicio de IA:', error);
      throw error;
    }
  }
}