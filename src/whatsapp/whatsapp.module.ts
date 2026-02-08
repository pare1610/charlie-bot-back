import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  imports: [CalendarModule],
  providers: [WhatsappService],
})
export class WhatsappModule {}
