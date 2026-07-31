import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

@Injectable()
export class SmsService {
  private readonly transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = createTransport({
      host: this.config.getOrThrow<string>('SMTP_HOST'),
      port: this.config.getOrThrow<number>('SMTP_PORT'),
      secure: false,
    });
  }

  async sendOtp(phoneNumber: string, code: string): Promise<void> {
    const provider = this.config.get<string>('SMS_PROVIDER', 'disabled');
    if (provider !== 'mailpit') {
      throw new ServiceUnavailableException({
        code: 'SMS_PROVIDER_UNAVAILABLE',
        message: 'Phone verification is temporarily unavailable.',
      });
    }

    await this.transporter.sendMail({
      from: this.config.getOrThrow<string>('SMTP_FROM'),
      to: this.config.getOrThrow<string>('SMS_DEV_INBOX'),
      subject: `Sanjari development SMS for ${phoneNumber}`,
      text: `Development SMS destination: ${phoneNumber}\nYour Sanjari verification code is ${code}. It expires in 10 minutes.`,
    });
  }
}
