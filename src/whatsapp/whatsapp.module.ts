import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { CalendarModule } from '../calendar/calendar.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [CalendarModule, AiModule],
  providers: [WhatsappService],
})
export class WhatsappModule {}
