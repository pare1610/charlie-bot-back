import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [AuthModule, EmailModule],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
