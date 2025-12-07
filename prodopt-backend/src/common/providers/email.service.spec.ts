import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';

// Мокаем fs и nodemailer
jest.mock('fs');
jest.mock('nodemailer');
const nodemailer = require('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let sendMailMock: jest.Mock;

  beforeEach(async () => {
    sendMailMock = jest.fn();
    nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });
    (fs.readFileSync as jest.Mock).mockReturnValue('<h1>Hello {{name}}</h1>');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SMTP_FROM') return 'test@prodopt.ru';
              return 'test-value';
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should send email with rendered template', async () => {
    await service.sendMail('user@example.com', 'Welcome', 'welcome', { name: 'Ivan' });

    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      from: 'test@prodopt.ru',
      to: 'user@example.com',
      subject: 'Welcome',
      // Проверяем, что Handlebars подставил имя (тест шаблона)
      html: expect.stringContaining('Hello Ivan'),
    }));
  });

  it('should not throw error if sending fails', async () => {
    sendMailMock.mockRejectedValue(new Error('SMTP Error'));
    
    // Метод не должен выбросить исключение, а просто залогировать ошибку
    await expect(service.sendMail('fail@test.com', 'Subject', 'tpl', {})).resolves.not.toThrow();
  });
});