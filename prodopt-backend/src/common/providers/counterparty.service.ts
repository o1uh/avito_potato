import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface CompanyDetails {
  name: string;
  inn: string;
  kpp?: string;
  ogrn: string;
  address: string;
  status: string; // ACTIVE, LIQUIDATING, etc.
  ceoName?: string;
}

@Injectable()
export class CounterpartyService {
  private readonly logger = new Logger(CounterpartyService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('DADATA_API_KEY');
  }

  async checkByInn(inn: string): Promise<CompanyDetails> {
    if (!this.apiKey) {
      this.logger.warn('DADATA_API_KEY is not set. Returning mock data.');
      return this.getMockData(inn);
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          this.apiUrl,
          { query: inn },
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Token ${this.apiKey}`,
            },
          },
        ),
      );

      if (!data.suggestions || data.suggestions.length === 0) {
        throw new HttpException('Организация не найдена', HttpStatus.NOT_FOUND);
      }

      const suggestion = data.suggestions[0];
      return {
        name: suggestion.value,
        inn: suggestion.data.inn,
        kpp: suggestion.data.kpp,
        ogrn: suggestion.data.ogrn,
        address: suggestion.data.address.value,
        status: suggestion.data.state.status,
        ceoName: suggestion.data.management?.name,
      };
    } catch (error) {
      this.logger.error(`DaData API Error: ${error.message}`);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Ошибка сервиса проверки контрагентов', HttpStatus.BAD_GATEWAY);
    }
  }

  private getMockData(inn: string): CompanyDetails {
    return {
      name: `ООО "Тестовая Компания ${inn}"`,
      inn,
      kpp: '770101001',
      ogrn: '1234567890123',
      address: 'г. Москва, ул. Примерная, д. 1',
      status: 'ACTIVE',
      ceoName: 'Иванов Иван Иванович',
    };
  }
}