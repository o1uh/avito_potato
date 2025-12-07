import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { ServiceUnavailableException } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  // Мок для HealthCheckService
  const mockHealthCheckService = {
    check: jest.fn(),
  };

  // Мок для HttpHealthIndicator
  const mockHttpHealthIndicator = {
    pingCheck: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: HttpHealthIndicator,
          useValue: mockHttpHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return result if health check is ok', async () => {
    const expectedResult = {
      status: 'ok',
      info: { database: { status: 'up' } },
      error: {},
      details: { database: { status: 'up' } },
    };

    // Настраиваем мок на успешный ответ
    mockHealthCheckService.check.mockResolvedValue(expectedResult);

    const result = await controller.check();
    expect(result).toEqual(expectedResult);
  });

  it('should throw 503 if DB is down', async () => {
    // Имитируем ошибку от Terminus (он выбрасывает ServiceUnavailableException при проблемах)
    const errorResponse = new ServiceUnavailableException({
      status: 'error',
      info: { database: { status: 'down' } },
      error: { database: { status: 'down', message: 'Connection refused' } },
      details: { database: { status: 'down', message: 'Connection refused' } },
    });

    mockHealthCheckService.check.mockRejectedValue(errorResponse);

    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
  });
});