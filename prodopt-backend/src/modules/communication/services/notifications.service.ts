import { Injectable } from '@nestjs/common';
import { EmailService } from '../../../common/providers/email.service';

interface NotificationPayload {
  to: string;
  subject: string;
  template: string;
  context: any;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly emailService: EmailService) {}

  async send(type: string, payload: NotificationPayload) {
    // В будущем здесь будет логика выбора канала (Socket/Push)
    await this.emailService.sendMail(
      payload.to,
      payload.subject,
      payload.template,
      payload.context,
    );
  }
}