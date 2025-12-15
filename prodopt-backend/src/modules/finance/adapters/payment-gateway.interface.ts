export interface CreatePaymentDto {
  amount: number;
  dealId: number;
  description: string;
}

export interface PaymentGatewayResponse {
  paymentUrl: string;
  paymentId: string; // ID на стороне банка
}

export interface IPaymentGateway {
  /**
   * Генерация ссылки на оплату или QR-кода
   */
  createPaymentLink(dto: CreatePaymentDto): Promise<PaymentGatewayResponse>;

  /**
   * Проверка подписи входящего вебхука
   */
  validateWebhookSignature(signature: string, body: any): boolean;
}