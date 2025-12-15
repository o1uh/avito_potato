import { Controller, Get, Put, Param, ParseIntPipe, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../prisma/prisma.service';

@ApiTags('Admin: Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/users')
export class UsersManagementController {
  constructor(private readonly prisma: PrismaService) {}

  @Put(':id/ban')
  @ApiOperation({ summary: 'Забанить пользователя' })
  async banUser(@Param('id', ParseIntPipe) id: number, @CurrentUser('role') role: number) {
    if (role !== 1) throw new ForbiddenException('Admin only');
    
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  @Put('company/:id/verify')
  @ApiOperation({ summary: 'Верифицировать компанию' })
  async verifyCompany(@Param('id', ParseIntPipe) id: number, @CurrentUser('role') role: number) {
    if (role !== 1) throw new ForbiddenException('Admin only');

    return this.prisma.company.update({
      where: { id },
      data: { verificationStatusId: 2 }, // Верифицирован
    });
  }
}