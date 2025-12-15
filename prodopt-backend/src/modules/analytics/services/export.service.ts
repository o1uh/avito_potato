import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateDealsReport(companyId: number): Promise<string> {
    const deals = await this.prisma.deal.findMany({
      where: { OR: [{ buyerCompanyId: companyId }, { supplierCompanyId: companyId }] },
      include: { status: true }
    });

    // Простая генерация CSV строки
    const header = 'ID,Role,Amount,Status,Date\n';
    const rows = deals.map(d => {
      const role = d.buyerCompanyId === companyId ? 'Buyer' : 'Supplier';
      return `${d.id},${role},${d.totalAmount},${d.status.name},${d.createdAt.toISOString()}`;
    }).join('\n');

    return header + rows;
  }
}