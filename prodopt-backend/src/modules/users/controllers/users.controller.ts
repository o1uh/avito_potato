import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  async getProfile(@CurrentUser('sub') userId: number) {
    const user = await this.usersService.findById(userId);
    // Удаляем чувствительные данные перед отправкой
    const { passwordHash, refreshTokenHash, ...result } = user;
    return { data: result };
  }
}