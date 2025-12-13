import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // Import added
import { StorageService } from './providers/storage.service';
import { EmailService } from './providers/email.service';
import { CounterpartyService } from './providers/counterparty.service';

@Global()
@Module({
  imports: [HttpModule], // Added
  providers: [StorageService, EmailService, CounterpartyService],
  exports: [StorageService, EmailService, CounterpartyService],
})
export class CommonModule {}