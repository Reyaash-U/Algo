import { z } from 'zod';

export const registerSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    displayName: z.string().min(2).max(60),
  }),
};

export const loginSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
};

export const googleLoginSchema = {
  body: z.object({ credential: z.string().min(20).max(4096) }),
};

export const verifyEmailSchema = {
  body: z.object({ token: z.string().min(16).max(256) }),
};

export const updateMeSchema = {
  body: z
    .object({
      displayName: z.string().min(2).max(60).optional(),
      cfHandle: z.string().min(1).max(40).nullable().optional(),
      digestEnabled: z.boolean().optional(),
      digestHour: z.number().int().min(0).max(23).optional(),
      timezone: z.string().min(1).max(64).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' }),
};
