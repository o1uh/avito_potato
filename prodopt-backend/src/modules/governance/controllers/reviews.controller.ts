import { Controller, Post, Body, Param, ParseIntPipe, UseGuards, Get } from '@nestjs/common'; // Добавил Get
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CompanyReviewsService } from '../services/company-reviews.service';
import { IsNumber, IsString, Min, Max } from 'class-validator';

class CreateReviewDto {
  @ApiProperty({ example: 5 }) @IsNumber() @Min(1) @Max(5) rating: number;
  @ApiProperty() @IsString() comment: string;
}

@ApiTags('Governance: Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: CompanyReviewsService) {}

  @Post('deal/:dealId')
  @ApiOperation({ summary: 'Оставить отзыв о компании по сделке' })
  async create(
    @Param('dealId', ParseIntPipe) dealId: number,
    @CurrentUser('companyId') companyId: number,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(companyId, dealId, dto.rating, dto.comment);
  }

  // --- НОВЫЙ ЭНДПОИНТ ---
  @Get('company/:id')
  @ApiOperation({ summary: 'Получить отзывы о компании' })
  async getCompanyReviews(@Param('id', ParseIntPipe) id: number) {
    return this.reviewsService.getReviewsByCompany(id);
  }
}