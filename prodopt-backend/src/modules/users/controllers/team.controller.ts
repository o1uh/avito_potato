import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UsersService } from '../services/users.service';
import { InviteMemberDto, ChangeRoleDto } from '../dto/team.dto';

@ApiTags('Team Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/team')
export class TeamController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Получить список сотрудников моей компании' })
  async getTeam(@CurrentUser() user: any) {
    return this.usersService.findAllByCompany(user.companyId);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Пригласить сотрудника (создать аккаунт)' })
  async inviteMember(
    @CurrentUser() user: any,
    @Body() dto: InviteMemberDto,
  ) {
    this.checkAdminPermissions(user.role);
    return this.usersService.inviteMember(user.companyId, dto.email, dto.fullName, dto.roleId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить сотрудника' })
  async removeMember(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.checkAdminPermissions(user.role);
    return this.usersService.removeMember(user.sub, user.companyId, id);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Изменить роль сотрудника' })
  async changeRole(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeRoleDto,
  ) {
    this.checkAdminPermissions(user.role);
    return this.usersService.changeRole(user.companyId, id, dto.roleId);
  }

  // Вспомогательный метод проверки прав (В будущем заменить на Guards)
  // Предполагаем, что в сидах ID роли 1 - это Владелец/Админ
  private checkAdminPermissions(roleId: number) {
    // В JwtStrategy мы кладем role: payload.role в user object
    // В БД поле называется roleInCompanyId. 
    // Нужно убедиться, что в токене лежит именно roleInCompanyId
    // В AuthService: payload = { sub: userId, email, companyId, role: user.roleInCompanyId }
    
    // Временная жесткая проверка: ID 1 = Админ
    if (roleId !== 1) {
      throw new ForbiddenException('Только администратор может управлять командой');
    }
  }
}