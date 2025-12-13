import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CounterpartyService } from './counterparty.service';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('CounterpartyService', () => {
  let service: CounterpartyService;
  let httpService: HttpService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'DADATA_API_KEY') return 'test_key';
      return null;
    }),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CounterpartyService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<CounterpartyService>(CounterpartyService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('Mock DaData: should map external API response to DTO', async () => {
    const inn = '7707083893';
    
    // Эмуляция ответа от DaData
    const daDataResponse: Partial<AxiosResponse> = {
      data: {
        suggestions: [
          {
            value: 'ПАО Сбербанк',
            data: {
              inn: '7707083893',
              kpp: '773601001',
              ogrn: '1027700132195',
              address: { value: 'г. Москва, ул. Вавилова, д. 19' },
              state: { status: 'ACTIVE' },
              management: { name: 'Греф Герман Оскарович' },
            },
          },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    // Мокаем HttpService.post, чтобы он возвращал Observable с нашим ответом
    jest.spyOn(httpService, 'post').mockReturnValue(of(daDataResponse as AxiosResponse));

    const result = await service.checkByInn(inn);

    // Проверки
    expect(result).toBeDefined();
    expect(result.name).toEqual('ПАО Сбербанк');
    expect(result.inn).toEqual(inn);
    expect(result.status).toEqual('ACTIVE');
    expect(result.ceoName).toEqual('Греф Герман Оскарович');
  });
});