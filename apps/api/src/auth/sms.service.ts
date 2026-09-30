import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

const beemSendUrl = 'https://apisms.beem.africa/v1/send';

function beemUnavailable(): never {
  throw new ServiceUnavailableException({
    code: 'SMS_PROVIDER_UNAVAILABLE',
    message: 'Phone verification is temporarily unavailable.',
  });
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
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
    const message = `Your Sanjari verification code is ${code}. It expires in 10 minutes.`;

    if (provider === 'beem') {
      await this.sendViaBeem(phoneNumber, message);
      return;
    }

    if (provider !== 'mailpit') {
      beemUnavailable();
    }

    await this.transporter.sendMail({
      from: this.config.getOrThrow<string>('SMTP_FROM'),
      to: this.config.getOrThrow<string>('SMS_DEV_INBOX'),
      subject: `Sanjari development SMS for ${phoneNumber}`,
      text: `Development SMS destination: ${phoneNumber}\n${message}`,
    });
  }

  /**
   * Beem Africa's REST SMS API (docs.beem.africa): POST JSON to
   * apisms.beem.africa/v1/send, Basic Auth with the API key as username and
   * the secret key as password. dest_addr is the MSISDN without the
   * leading '+' that our own PhoneNumberDto format requires.
   */
  private async sendViaBeem(phoneNumber: string, message: string): Promise<void> {
    const apiKey = this.config.getOrThrow<string>('BEEM_API_KEY');
    const secretKey = this.config.getOrThrow<string>('BEEM_SECRET_KEY');
    const sourceAddr = this.config.getOrThrow<string>('BEEM_SENDER_ID');
    const destAddr = phoneNumber.replace(/^\+/, '');
    const auth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');

    let response: Response;
    try {
      response = await fetch(beemSendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          source_addr: sourceAddr,
          encoding: 0,
          message,
          recipients: [{ recipient_id: 1, dest_addr: destAddr }],
        }),
      });
    } catch (error) {
      this.logger.error(`Beem SMS request failed: ${(error as Error).message}`);
      beemUnavailable();
    }

    const body = (await response.json().catch(() => null)) as
      | { successful?: boolean; code?: number; message?: string }
      | null;

    if (!response.ok || !body?.successful) {
      this.logger.error(
        `Beem SMS send failed (status ${response.status}): ${body?.message ?? 'unknown error'}`,
      );
      beemUnavailable();
    }
  }
}
