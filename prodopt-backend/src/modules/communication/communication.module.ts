import { Module, Global} from '@nestjs/common';
import { NotificationsService } from './services/notifications.service';
import { NotificationsController } from './controllers/notifications.controller';
import { ChatService } from './services/chat.service';
import { ChatController } from './controllers/chat.controller';
import { ChatGateway } from './gateways/chat.gateway';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';

@Global()
@Module({
   imports: [PrismaModule, CommonModule],
  controllers: [NotificationsController, ChatController],
  providers: [NotificationsService, ChatService, ChatGateway],
  exports: [NotificationsService],
})
export class CommunicationModule {}