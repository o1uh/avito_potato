import { Controller, Post, Body, Param, ParseIntPipe, UseGuards, Put, Get, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { DisputesService } from '../services/disputes.service';
import { IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';

class CreateDisputeDto {
  @ApiProperty() @IsString() @IsNotEmpty() reason: string;
  @ApiProperty() @IsString() @IsNotEmpty() demands: string;
}

class ResolveDisputeDto {
  @ApiProperty() @IsString() @IsNotEmpty() decision: string;
  @ApiProperty() @IsNumber() @Min(0) refundAmount: number;
  @ApiProperty() @IsNumber() winnerCompanyId: number;
}

@ApiTags('Governance: Disputes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}
  
  @Get()
  @ApiOperation({ summary: 'Получить список активных споров (Только Админ)' })
  async getAll(@CurrentUser('role') role: number) {
    // Простейшая проверка прав (1 = Админ)
    if (role !== 1) {
      throw new ForbiddenException('Доступ запрещен');
    }
    return this.disputesService.findAllOpen();
  }

  @Post(':dealId')
  @ApiOperation({ summary: 'Открыть спор по сделке' })
  async create(
    @Param('dealId', ParseIntPipe) dealId: number,
    @CurrentUser('sub') userId: number,
    @CurrentUser('companyId') companyId: number,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.disputesService.openDispute(dealId, userId, companyId, dto.reason, dto.demands);
  }

  @Put(':id/resolve')
  @ApiOperation({ summary: 'Разрешить спор (Только Арбитр/Админ)' })
  async resolve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('role') role: number,
    @Body() dto: ResolveDisputeDto,
  ) {
    // Проверка прав (в реальном коде через Guard, тут упрощенно role=1 admin)
    if (role !== 1) throw new Error('Access denied');
    
    return this.disputesService.resolveDispute(id, dto.decision, dto.refundAmount, dto.winnerCompanyId);
  }
}