import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = createTransport({
      host: this.config.getOrThrow<string>('SMTP_HOST'),
      port: this.config.getOrThrow<number>('SMTP_PORT'),
      secure: false,
    });
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.getOrThrow<string>('SMTP_FROM'),
      to: email,
      subject: 'Verify your Sanjari email',
      text: `Your Sanjari verification code is ${code}. It expires in 10 minutes. If you did not create this account, you can ignore this email.`,
    });
  }

  async sendConversationCopy(
    chaperoneEmail: string,
    context: { senderName: string; recipientName: string; body: string },
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.getOrThrow<string>('SMTP_FROM'),
      to: chaperoneEmail,
      subject: `Sanjari chaperone copy: ${context.senderName} & ${context.recipientName}`,
      text: `As the chaperone for this conversation, here is a copy of a new message.\n\nFrom: ${context.senderName}\n\n${context.body}`,
    });
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${this.config.getOrThrow<string>('APP_PUBLIC_URL')}/reset-password?token=${encodeURIComponent(token)}`;
    await this.transporter.sendMail({
      from: this.config.getOrThrow<string>('SMTP_FROM'),
      to: email,
      subject: 'Reset your Sanjari password',
      text: `Use this link to reset your Sanjari password: ${resetUrl}\n\nThis link expires in 30 minutes. If you did not request a reset, you can ignore this email.`,
    });
  }
}
