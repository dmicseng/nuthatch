import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').trim(),
  inviteToken: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

export const inviteSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  role: z.enum(['admin', 'member', 'viewer']),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
