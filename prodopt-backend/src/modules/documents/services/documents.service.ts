import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common'; // Добавлены исключения
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from '../../../common/providers/storage.service';
import { PdfGeneratorService } from './pdf-generator.service';


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
    type: 'invoice' | 'contract', // Для примера, можно расширить
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

    // 4. Поиск ID типа документа и статуса (можно оптимизировать через кэш)
    const docType = await this.prisma.documentType.findFirst({
      where: { name: type === 'invoice' ? 'Счет' : 'Договор' },
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
    // 1. Если это Админ (предположим roleId === 1 - это Admin, или проверка через Guard, но здесь логическая проверка)
    // 2. ИЛИ Если это владелец документа (uploadedBy)
    // Примечание: В реальной системе роль лучше проверять через enum или константу
    const isAdmin = userRole === 1; // Условно, зависит от вашей ролевой модели в БД (seed.ts)
    const isOwner = document.uploadedById === userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('Нет прав на скачивание этого документа');
    }

    // Извлекаем ключ из URL. 
    // URL в БД: http://minio:9000/bucket/documents/file.pdf
    // Нам нужен ключ: documents/file.pdf
    const urlParts = document.fileUrl.split('/');
    // Берем последние 2 части (папка + файл)
    // Внимание: это упрощенная логика. В продакшене лучше хранить key отдельно в БД.
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