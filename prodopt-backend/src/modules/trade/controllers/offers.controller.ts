import { Controller, Post, Put, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
}