import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; // <--- Добавлено
import { ConfigModule, ConfigService } from '@nestjs/config'; // <--- Добавлено
import { NotificationsService } from './services/notifications.service';
import { NotificationsController } from './controllers/notifications.controller';
import { ChatService } from './services/chat.service';
import { ChatController } from './controllers/chat.controller';
import { ChatGateway } from './gateways/chat.gateway';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';

@Global()
@Module({
  imports: [
    PrismaModule, 
    CommonModule,
    ConfigModule,
    JwtModule.registerAsync({ // Настройка JWT для валидации в сокетах
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController, ChatController],
  providers: [NotificationsService, ChatService, ChatGateway],
  exports: [NotificationsService],
})
export class CommunicationModule {}