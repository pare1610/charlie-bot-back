import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { CalendarService } from './calendar/calendar.service';

@Module({
  imports: [WhatsappModule],
  controllers: [AppController],
  providers: [AppService, CalendarService],
})
export class AppModule {}
