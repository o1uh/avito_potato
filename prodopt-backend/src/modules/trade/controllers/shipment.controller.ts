import { Controller, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ShipmentService } from '../services/shipment.service';
import { DealsService } from '../services/deals.service';
import { AddTrackingDto } from '../dto/shipment.dto';

@ApiTags('Trade: Logistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trade/deals')
export class ShipmentController {
  constructor(
    private readonly shipmentService: ShipmentService,
    private readonly dealsService: DealsService,
  ) {}

  @Post(':id/shipment')
  @ApiOperation({ summary: 'Добавить трек-номер и перевести в SHIPPED (Поставщик)' })
  async addTracking(
    @Param('id', ParseIntPipe) dealId: number,
    @CurrentUser('companyId') companyId: number,
    @Body() dto: AddTrackingDto,
  ) {
    return this.shipmentService.addTracking(dealId, companyId, dto);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Подтвердить приемку и завершить сделку (Покупатель)' })
  async confirmDelivery(
    @Param('id', ParseIntPipe) dealId: number,
    @CurrentUser('companyId') companyId: number,
  ) {
    return this.dealsService.confirmDelivery(dealId, companyId);
  }
}