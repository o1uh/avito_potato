import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RfqService } from '../services/rfq.service';
import { CreateRfqDto } from '../dto/trade.dto';

@ApiTags('Trade: RFQ')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trade/rfq')
export class RfqController {
  constructor(private readonly rfqService: RfqService) {}

  @Post()
  @ApiOperation({ summary: 'Создать запрос на закупку (Покупатель)' })
  async create(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: CreateRfqDto,
  ) {
    return this.rfqService.create(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Список запросов (Мои + Публичные)' })
  async list(@CurrentUser('companyId') companyId: number) {
    return this.rfqService.findAll(companyId);
  }
}