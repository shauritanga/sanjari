import { z } from 'zod';

export const profileUpdateSchema = z.object({
  displayName: z.string().min(2).max(60).optional(),
  biography: z.string().max(500).optional(),
  pronouns: z.string().max(40).optional(),
  city: z.string().max(120).optional(),
  relationshipIntentions: z.array(z.string().min(1)).max(5).optional(),
  languages: z.array(z.string().min(2).max(16)).max(12).optional(),
  interests: z.array(z.string().min(1).max(40)).max(30).optional()
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
