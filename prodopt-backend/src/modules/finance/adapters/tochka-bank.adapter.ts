import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPaymentGateway, CreatePaymentDto, PaymentGatewayResponse } from './payment-gateway.interface';
import * as crypto from 'crypto';

@Injectable()
export class TochkaBankAdapter implements IPaymentGateway {
  private readonly logger = new Logger(TochkaBankAdapter.name);
  private readonly webhookSecret: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>('BANK_WEBHOOK_SECRET') || 'default-secret-key';
    this.baseUrl = 'https://enter.tochka.com/api/v1'; // Пример URL
  }

  async createPaymentLink(dto: CreatePaymentDto): Promise<PaymentGatewayResponse> {
    this.logger.log(`Generating payment link for Deal #${dto.dealId}, Amount: ${dto.amount}`);

    // В реальной интеграции здесь был бы запрос к API банка (HttpService.post)
    // Для MVP мы генерируем ссылку, которая ведет на эмуляцию оплаты (или фронтенд страницу оплаты)
    
    const paymentId = `TOCHKA-${Date.now()}-${dto.dealId}`;
    const paymentUrl = `https://pay.prodopt.ru/pay?id=${paymentId}&amount=${dto.amount}`;

    return {
      paymentUrl,
      paymentId,
    };
  }

  validateWebhookSignature(signature: string, body: any): boolean {
    // Реализация проверки HMAC-SHA256 подписи (стандарт для банковских вебхуков)
    // Банк присылает подпись тела запроса, используя секретный ключ
    
    if (!signature) return false;

    // Для целей разработки, если секрет 'default-secret-key', пропускаем упрощенно
    if (this.webhookSecret === 'default-secret-key') {
        this.logger.warn('Warning: Using default webhook secret. Security check skipped.');
        return true;
    }

    try {
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      const digest = hmac.update(JSON.stringify(body)).digest('hex');
      return signature === digest;
    } catch (e) {
      this.logger.error('Signature validation error', e);
      return false;
    }
  }
}