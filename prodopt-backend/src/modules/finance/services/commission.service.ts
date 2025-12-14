import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CommissionService {
  private readonly defaultRate: number;

  constructor(private configService: ConfigService) {
    // Получаем ставку из ENV или ставим 2% по умолчанию
    this.defaultRate = this.configService.get<number>('PLATFORM_FEE_PERCENT') || 2.0;
  }

  /**
   * Рассчитывает комиссию платформы
   * @param amount Общая сумма сделки
   */
  calculate(amount: number): number {
    // Округляем до 2 знаков
    const fee = (amount * this.defaultRate) / 100;
    return Math.round(fee * 100) / 100;
  }
}