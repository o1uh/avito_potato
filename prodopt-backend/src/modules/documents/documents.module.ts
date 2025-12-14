import { Module } from '@nestjs/common';
import { DocumentsService } from './services/documents.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { DocumentsController } from './controllers/documents.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, PdfGeneratorService],
  exports: [DocumentsService],
})
export class DocumentsModule {}