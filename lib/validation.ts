import { z } from 'zod';

export const symbolSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9.\-:]{0,19}$/, 'Enter a valid ticker symbol');

const money = (label: string) =>
  z.coerce.number({ error: `${label} must be a number` }).finite().min(0, `${label} cannot be negative`).max(1e9);

export const transactionInputSchema = z
  .object({
    symbol: symbolSchema,
    side: z.enum(['BUY', 'SELL', 'DIVIDEND']),
    quantity: z.coerce.number({ error: 'Quantity must be a number' }).finite().positive('Quantity must be greater than 0').max(1e9),
    price: money('Price'),
    fees: money('Fees').default(0),
    executedAt: z.coerce.date({ error: 'Enter a valid date' }),
    notes: z.string().trim().max(280, 'Notes must be 280 characters or fewer').optional().default(''),
  })
  .refine((t) => t.side === 'DIVIDEND' || t.price > 0, { message: 'Price must be greater than 0', path: ['price'] })
  .refine((t) => t.executedAt.getTime() <= Date.now() + 24 * 3600 * 1000, {
    message: 'Trade date cannot be in the future',
    path: ['executedAt'],
  })
  .refine((t) => t.executedAt.getUTCFullYear() >= 1970, { message: 'Enter a valid date', path: ['executedAt'] });

export type TransactionInput = z.input<typeof transactionInputSchema>;

export const alertInputSchema = z.object({
  symbol: symbolSchema,
  company: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1, 'Give the alert a name').max(60),
  condition: z.enum(['PRICE_ABOVE', 'PRICE_BELOW', 'PCT_UP', 'PCT_DOWN']),
  threshold: z.coerce.number({ error: 'Threshold must be a number' }).finite().positive('Threshold must be greater than 0').max(1e7),
  frequency: z.enum(['ONCE', 'DAILY']).default('ONCE'),
});

export type AlertInput = z.input<typeof alertInputSchema>;

export const watchlistInputSchema = z.object({
  symbol: symbolSchema,
  company: z.string().trim().min(1).max(120),
});

export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const emailSchema = z.email('Enter a valid email address');
