import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter;
  private readonly resendApiKey: string;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.resendApiKey = this.config.get<string>('RESEND_API_KEY', '');
    this.from = this.config.get<string>('RESEND_FROM') || this.config.getOrThrow<string>('SMTP_FROM');
    this.transporter = createTransport({
      host: this.config.getOrThrow<string>('SMTP_HOST'),
      port: this.config.getOrThrow<number>('SMTP_PORT'),
      secure: false,
    });
  }

  private async sendMail(message: { to: string; subject: string; text: string; html?: string }): Promise<void> {
    if (this.resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, ...message }),
      });
      if (!response.ok) {
        throw new Error(`Resend email delivery failed (${response.status}).`);
      }
      return;
    }
    await this.transporter.sendMail({ from: this.from, ...message });
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Verify your Sanjari email',
      text: `Your Sanjari verification code is ${code}. It expires in 10 minutes. If you did not create this account, you can ignore this email.`,
      html: this.verificationTemplate(code),
    });
  }

  private verificationTemplate(code: string): string {
    return `<!doctype html><html><body style="margin:0;background:#f8f5f8;font-family:Arial,sans-serif;color:#211a24"><div style="max-width:560px;margin:32px auto;background:#fff;border-radius:18px;padding:36px 28px;box-shadow:0 4px 20px rgba(40,20,40,.08)"><div style="font-size:26px;font-weight:800;color:#e83e87;margin-bottom:28px">Sanjari</div><h1 style="font-size:24px;margin:0 0 12px">Verify your email</h1><p style="font-size:16px;line-height:1.6;color:#625b64">Use this verification code to continue:</p><div style="letter-spacing:10px;text-align:center;font-size:32px;font-weight:800;color:#e83e87;background:#fff0f6;border-radius:12px;padding:18px 10px;margin:24px 0">${code}</div><p style="font-size:14px;line-height:1.6;color:#625b64">This code expires in 10 minutes. If you did not request it, you can safely ignore this email.</p><p style="font-size:13px;color:#958d96;margin-top:32px">Sanjari · Meet with intention</p></div></body></html>`;
  }

  async sendConversationCopy(
    chaperoneEmail: string,
    context: { senderName: string; recipientName: string; body: string },
  ): Promise<void> {
    await this.sendMail({
      to: chaperoneEmail,
      subject: `Sanjari chaperone copy: ${context.senderName} & ${context.recipientName}`,
      text: `As the chaperone for this conversation, here is a copy of a new message.\n\nFrom: ${context.senderName}\n\n${context.body}`,
    });
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${this.config.getOrThrow<string>('APP_PUBLIC_URL')}/reset-password?token=${encodeURIComponent(token)}`;
    await this.sendMail({
      to: email,
      subject: 'Reset your Sanjari password',
      text: `Use this link to reset your Sanjari password: ${resetUrl}\n\nThis link expires in 30 minutes. If you did not request a reset, you can ignore this email.`,
    });
  }
}
