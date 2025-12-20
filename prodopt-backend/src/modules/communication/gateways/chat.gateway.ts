import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // В продакшене лучше указать конкретный домен фронтенда
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token || client.handshake.headers.authorization;
    
    if (!token) {
      this.logger.warn(`Client ${client.id} has no token, disconnecting...`);
      client.disconnect();
      return;
    }

    try {
      // Валидация токена
      const cleanToken = token.replace('Bearer ', '');
      const payload = await this.jwtService.verifyAsync(cleanToken, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Присоединяем клиента к комнате с его userId
      // Это позволяет отправлять сообщения лично ему: server.to(`user_${userId}`).emit(...)
      const userId = payload.sub;
      client.join(`user_${userId}`);
      
      this.logger.log(`Client ${client.id} connected (User ID: ${userId})`);
    } catch (e) {
      this.logger.error(`Connection unauthorized: ${e.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  // Метод для вызова из сервисов
  sendNotificationToUser(userId: number, payload: any) {
    this.server.to(`user_${userId}`).emit('notification', payload);
  }
}