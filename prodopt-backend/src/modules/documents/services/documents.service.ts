import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from '../../../common/providers/storage.service';
import { PdfGeneratorService } from './pdf-generator.service';

// Расширяем типы документов
export type DocTemplateType = 'invoice' | 'contract' | 'act' | 'upd';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly pdfGenerator: PdfGeneratorService,
  ) {}

  /**
   * Генерирует документ, загружает в S3 и сохраняет метаданные в БД
   */
  async createDocument(
    type: DocTemplateType, // Используем обновленный тип
    data: any,
    userId: number,
    entityType: 'deal' | 'company',
    entityId: number,
  ) {
    this.logger.log(`Start generating document ${type} for ${entityType} #${entityId}`);

    // 1. Генерация PDF буфера
    const pdfBuffer = await this.pdfGenerator.generate(type, data);

    // 2. Подготовка файла для StorageService (эмуляция Multer File)
    const fileName = `${type}_${entityId}_${Date.now()}.pdf`;
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: fileName,
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: pdfBuffer,
      size: pdfBuffer.length,
      stream: null,
      destination: '',
      filename: fileName,
      path: '',
    };

    // 3. Загрузка в S3
    const { url } = await this.storageService.upload(mockFile, 'documents');

    // 4. Поиск ID типа документа
    // Маппинг ключа шаблона на название в БД (см. seed.ts)
    const typeMap: Record<DocTemplateType, string> = {
        invoice: 'Счет',
        contract: 'Договор',
        act: 'Акт',
        upd: 'УПД'
    };

    const docTypeName = typeMap[type];
    
    const docType = await this.prisma.documentType.findFirst({
      where: { name: docTypeName },
    });
    
    // 5. Сохранение в БД
    const document = await this.prisma.document.create({
      data: {
        entityType,
        entityId,
        fileUrl: url,
        documentTypeId: docType ? docType.id : 1, // Fallback на ID 1 если не найдено
        documentStatusId: 1, // Создан
        uploadedById: userId,
      },
    });

    return document;
  }

  async getDownloadLink(documentId: number, userId: number, userRole: number) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Документ не найден');
    }

    // Проверка прав:
    // 1. Если это Админ (предположим roleId === 1 - это Admin)
    // 2. ИЛИ Если это владелец документа (uploadedBy)
    const isAdmin = userRole === 1; 
    const isOwner = document.uploadedById === userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('Нет прав на скачивание этого документа');
    }

    // Извлекаем ключ из URL
    const urlParts = document.fileUrl.split('/');
    const key = urlParts.slice(-2).join('/');

    // Генерируем временную ссылку (действует 15 минут)
    return this.storageService.getSignedUrl(key, 900);
  }

  async findByEntity(entityType: string, entityId: number) {
    return this.prisma.document.findMany({
      where: { entityType, entityId },
      include: { documentType: true, documentStatus: true },
    });
  }
}