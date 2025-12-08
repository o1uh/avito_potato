import { Module } from '@nestjs/common';
import { NotificationsService } from './services/notifications.service';
import { NotificationsController } from './controllers/notifications.controller';
import { ChatService } from './services/chat.service';
import { ChatController } from './controllers/chat.controller';
import { ChatGateway } from './gateways/chat.gateway';

@Module({
  controllers: [NotificationsController, ChatController],
  providers: [NotificationsService, ChatService, ChatGateway],
  exports: [NotificationsService],
})
export class CommunicationModule {}