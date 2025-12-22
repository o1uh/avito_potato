import { Controller, Post, Put, Get, Body, Param, ParseIntPipe, UseGuards, Query, Patch  } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OffersService } from '../services/offers.service';
import { CreateOfferDto, NegotiateOfferDto } from '../dto/trade.dto';

@ApiTags('Trade: Offers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trade/offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  @ApiOperation({ summary: 'Отправить КП (Поставщик)' })
  async create(
    @CurrentUser('companyId') companyId: number,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offersService.create(companyId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Изменить условия КП (Торг)' })
  async negotiate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
    @Body() dto: NegotiateOfferDto,
  ) {
    return this.offersService.negotiate(id, companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список КП (Входящие/Исходящие)' })
  @ApiQuery({ name: 'type', enum: ['sent', 'received'], description: 'sent - отправленные мной, received - полученные мной' })
  async list(
    @CurrentUser('companyId') companyId: number,
    @Query('type') type: 'sent' | 'received',
  ) {
    return this.offersService.findAll(companyId, type);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Отклонить КП (Покупатель)' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') companyId: number,
  ) {
    return this.offersService.reject(id, companyId);
  }

}