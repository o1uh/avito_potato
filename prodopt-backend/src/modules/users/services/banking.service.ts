import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AddBankAccountDto } from '../dto/banking.dto';

@Injectable()
export class BankingService {
  constructor(private readonly prisma: PrismaService) {}

  async addAccount(companyId: number, dto: AddBankAccountDto) {
    // Простая валидация БИК (можно расширить)
    if (!/^\d{9}$/.test(dto.bankBik)) {
      throw new BadRequestException('Некорректный БИК');
    }

    // Если этот счет делается основным, сбрасываем флаг у других
    if (dto.isPrimary) {
      await this.prisma.paymentDetail.updateMany({
        where: { companyId },
        data: { isPrimary: false },
      });
    }

    // TODO: Здесь можно добавить запрос к справочнику банков по БИК для проверки названия

    return this.prisma.paymentDetail.create({
      data: {
        companyId,
        bik: dto.bankBik,
        bankName: dto.bankName,
        checkingAccount: dto.checkingAccount,
        correspondentAccount: dto.correspondentAccount,
        isPrimary: dto.isPrimary ?? false,
      },
    });
  }

  async getAccounts(companyId: number) {
    return this.prisma.paymentDetail.findMany({
      where: { companyId },
      orderBy: { isPrimary: 'desc' },
    });
  }
}