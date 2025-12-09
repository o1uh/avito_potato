import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { RegisterDto, LoginDto } from '../dto/auth.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация пользователя и компании' })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    const tokens = await this.authService.register(dto);
    return { data: tokens };
  }

  @Post('login')
  @ApiOperation({ summary: 'Вход в систему' })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const tokens = await this.authService.login(dto);
    return { data: tokens };
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Выход из системы' })
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('sub') userId: number) {
    await this.authService.logout(userId);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiBearerAuth()
  @Post('refresh')
  @ApiOperation({ summary: 'Обновление токенов (Refresh Token)' })
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @CurrentUser('sub') userId: number,
    @CurrentUser('refreshToken') refreshToken: string,
  ) {
    const tokens = await this.authService.refreshTokens(userId, refreshToken);
    return { data: tokens };
  }
}