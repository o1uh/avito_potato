import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CommissionService } from './commission.service';
import { CreateEscrowDto } from '../dto/create-escrow.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionService: CommissionService,
  ) {}

  async create(dto: CreateEscrowDto, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    const fee = this.commissionService.calculate(dto.totalAmount);

    try {
      return await client.escrowAccount.create({
        data: {
          dealId: dto.dealId,
          totalAmount: dto.totalAmount,
          amountDeposited: 0,
          platformFeeAmount: fee,
          escrowStatusId: 1, 
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create escrow for deal ${dto.dealId}`, error);
      throw new InternalServerErrorException('Could not create escrow account');
    }
  }

  async deposit(dealId: number, amount: number) {
    return this.callProcedure(dealId, amount, 'DEPOSIT');
  }

  async release(dealId: number) {
    const account = await this.prisma.escrowAccount.findUnique({ where: { dealId } });
    if (!account) throw new Error('Escrow account not found');

    const amountToRelease = Number(account.amountDeposited) - Number(account.platformFeeAmount);
    
    if (amountToRelease <= 0) {
        this.logger.warn(`Release amount <= 0 for deal ${dealId}`);
        return; 
    }

    await this.callProcedure(dealId, amountToRelease, 'RELEASE');
  }

  async refund(dealId: number, amount: number) {
    return this.callProcedure(dealId, amount, 'REFUND');
  }

  async getBalance(dealId: number) {
    return this.prisma.escrowAccount.findUnique({
      where: { dealId },
    });
  }

  private async callProcedure(dealId: number, amount: number, operation: 'DEPOSIT' | 'RELEASE' | 'REFUND') {
    try {
      // ИСПРАВЛЕНИЕ: Явное приведение типов (::integer, ::numeric)
      await this.prisma.$executeRaw`CALL process_escrow(${dealId}::integer, ${amount}::numeric, ${operation})`;
      
      this.logger.log(`Escrow operation ${operation} success for deal ${dealId}, amount: ${amount}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Escrow procedure failed: ${error.message}`, error);
      throw new InternalServerErrorException(error.message);
    }
  }
}