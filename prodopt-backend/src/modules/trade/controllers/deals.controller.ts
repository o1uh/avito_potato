import { Controller, Post, Get, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { DealsService } from '../services/deals.service';
import { CreateDealFromOfferDto } from '../dto/trade.dto';
import { DealStatus } from '../utils/deal-state-machine';

@ApiTags('Trade: Deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trade/deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post('from-offer')
  @ApiOperation({ summary: 'Создать сделку из КП (Покупатель)' })
  async create(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: CreateDealFromOfferDto,
  ) {
    return this.dealsService.createFromOffer(dto, companyId);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список сделок' })
  async getAll(@CurrentUser('companyId') companyId: number) {
    return this.dealsService.findAll(companyId);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Принять условия сделки (Переход в AGREED, создание счета)' })
  @ApiBody({ schema: { type: 'object', properties: { deliveryAddressId: { type: 'number' } } } })
  async accept(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @CurrentUser('sub') userId: number,
    @Body() body: { deliveryAddressId?: number } = {},
  ) {
    // Передаем адрес в сервис
    return this.dealsService.changeStatus(id, userId, companyId, DealStatus.AGREED, body.deliveryAddressId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить сделку (IDOR protected)' })
  async getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ) {
    return this.dealsService.findById(id, companyId);
  }
}