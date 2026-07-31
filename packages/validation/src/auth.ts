import { isAdult } from '@sanjari/shared-utils';
import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(12).max(128),
    dateOfBirth: z.coerce.date(),
    acceptedTermsVersion: z.string().min(1),
    acceptedPrivacyVersion: z.string().min(1),
    confirmedAdult: z.literal(true),
    locale: z.enum(['en', 'sw']).default('en')
  })
  .superRefine((value, ctx) => {
    if (!isAdult(value.dateOfBirth)) {
      ctx.addIssue({
        code: 'custom',
        path: ['dateOfBirth'],
        message: 'You must be at least 18 years old to use Sanjari.'
      });
    }
  });

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
  deviceId: z.string().min(8).max(128)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
