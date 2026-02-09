import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CalendarModule } from './calendar/calendar.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, CalendarModule, WhatsappModule],
})
export class AppModule {}
