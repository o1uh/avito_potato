import { Controller, Post, Body, UseGuards, Get, Query, Param, ParseIntPipe, Res } from '@nestjs/common'; // Добавлен Res, Param, ParseIntPipe
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { DocumentsService } from '../services/documents.service';
import { Response } from 'express'; // Для редиректа

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('test-generate')
  @ApiOperation({ summary: 'Тестовая генерация документа (Dev Only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'invoice' },
        data: {
          type: 'object',
          example: {
            number: '123',
            date: '2025-05-20',
            totalAmount: 5000,
            supplier: { name: 'ООО Ромашка', inn: '123', address: 'Москва' },
            buyer: { name: 'ИП Иванов', inn: '456', address: 'Питер' },
            items: [{ name: 'Молоко', quantity: 10, price: 100, total: 1000 }],
          },
        },
      },
    },
  })
  async generate(
    @CurrentUser('sub') userId: number,
    @Body() body: { type: 'invoice' | 'contract'; data: any },
  ) {
    // В реальном методе entityId будет ID сделки
    // Здесь ставим заглушку entityId: 1
    return this.documentsService.createDocument(
      body.type,
      body.data,
      userId,
      'deal',
      1, 
    );
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Скачать документ (Получить временную ссылку)' })
  async download(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Res() res: Response, // Используем Response для редиректа
  ) {
    const url = await this.documentsService.getDownloadLink(
      id, 
      user.sub, 
      user.role // Передаем роль для проверки прав
    );
    
    // Редиректим пользователя сразу на файл в MinIO/S3
    return res.redirect(url);
  }

  @Get('list')
  @ApiOperation({ summary: 'Список документов по сущности' })
  async list(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.documentsService.findByEntity(entityType, parseInt(entityId));
  }
}