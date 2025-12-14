import { Controller, Post, Get, Body, UseGuards, Put, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PartnersService } from './partners.service';

@ApiTags('Networking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('networking')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post('requests')
  @ApiOperation({ summary: 'Отправить запрос на партнерство' })
  async sendRequest(
    @CurrentUser('companyId') myCompanyId: number,
    @Body() body: { recipientId: number; message: string },
  ) {
    return this.partnersService.sendRequest(myCompanyId, body.recipientId, body.message);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Мои запросы (входящие и исходящие)' })
  async getRequests(@CurrentUser('companyId') myCompanyId: number) {
    return this.partnersService.getMyRequests(myCompanyId);
  }

  @Put('requests/:id/approve')
  @ApiOperation({ summary: 'Принять запрос' })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('companyId') myCompanyId: number,
  ) {
    return this.partnersService.approveRequest(id, myCompanyId);
  }
}