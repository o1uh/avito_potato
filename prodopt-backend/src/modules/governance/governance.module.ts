import { Module } from '@nestjs/common';
import { DisputesService } from './services/disputes.service';
import { DisputesController } from './controllers/disputes.controller';
import { CompanyReviewsService } from './services/company-reviews.service';
import { ReviewsController } from './controllers/reviews.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [PrismaModule, FinanceModule],
  controllers: [DisputesController, ReviewsController],
  providers: [DisputesService, CompanyReviewsService],
})
export class GovernanceModule {}