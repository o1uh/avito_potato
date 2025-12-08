import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Мокаем S3 Client
jest.mock('@aws-sdk/client-s3');

describe('StorageService', () => {
  let service: StorageService;
  let s3ClientSendMock: jest.Mock;

  beforeEach(async () => {
    // Сбрасываем моки перед каждым тестом
    s3ClientSendMock = jest.fn();
    (S3Client as jest.Mock).mockImplementation(() => ({
      send: s3ClientSendMock,
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === 'AWS_BUCKET') return 'test-bucket';
              if (key === 'AWS_ENDPOINT') return 'http://minio:9000';
              return 'test';
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should upload file and return key/url', async () => {
    const mockFile = {
      originalname: 'test.jpg',
      buffer: Buffer.from('fake-image'),
      mimetype: 'image/jpeg',
    } as any;

    const result = await service.upload(mockFile, 'avatars');

    // Проверяем, что S3 send был вызван
    expect(s3ClientSendMock).toHaveBeenCalled();
    
    // Проверяем аргумент команды (что это PutObjectCommand)
    const callArg = s3ClientSendMock.mock.calls[0][0];
    expect(callArg).toBeInstanceOf(PutObjectCommand);
    
    // Проверяем результат
    expect(result.key).toMatch(/^avatars\/.*\.jpg$/); // Папка/UUID.расширение
    expect(result.url).toContain('http://minio:9000/test-bucket/avatars/');
  });
});