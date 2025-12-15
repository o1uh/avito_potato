import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { TochkaBankAdapter } from '../adapters/tochka-bank.adapter';

@Injectable()
export class BankWebhookGuard implements CanActivate {
  private readonly logger = new Logger(BankWebhookGuard.name);

  constructor(private readonly bankAdapter: TochkaBankAdapter) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-signature']; // Заголовок с подписью от банка
    const body = request.body;

    if (!signature) {
      this.logger.warn('Webhook request missing signature');
      throw new ForbiddenException('Missing signature');
    }

    const isValid = this.bankAdapter.validateWebhookSignature(signature, body);

    if (!isValid) {
      this.logger.warn('Invalid webhook signature');
      throw new ForbiddenException('Invalid signature');
    }

    return true;
  }
}