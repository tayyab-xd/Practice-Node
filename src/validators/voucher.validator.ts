import { z } from 'zod';
import { PAYMENT_MODE, PAYMENT_MODE_IDS, VOUCHER_TYPE_IDS } from '../constants/voucher.js';

export const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date in YYYY-MM-DD format')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Must be a real calendar date');

export const paginationQuery = {
  limit: z.coerce.number().int().min(1).max(100).default(15),
  offset: z.coerce.number().int().min(0).default(0),
};

export const voucherTypeId = z.coerce
  .number()
  .int()
  .refine((value) => (VOUCHER_TYPE_IDS as readonly number[]).includes(value), {
    message: 'Must be 2 (receipt), 3 (payment) or 4 (journal)',
  });

export const listVouchersQuerySchema = z
  .object({
    ...paginationQuery,
    search: z.string().trim().max(100).default(''),
    voucher_type_id: voucherTypeId.optional(),
    date_from: isoDateString.optional(),
    date_to: isoDateString.optional(),
  })
  .refine((query) => !query.date_from || !query.date_to || query.date_from <= query.date_to, {
    message: 'date_from must not be after date_to',
    path: ['date_from'],
  });

export type ListVouchersQuery = z.infer<typeof listVouchersQuerySchema>;

export const bigintId = z.string().regex(/^[1-9]\d{0,17}$/, "Must be a positive whole number");

export const voucherIdParamsSchema = z.object({
  voucher_id: bigintId,
});

export type VoucherIdParams = z.infer<typeof voucherIdParamsSchema>;

export const previousBalanceQuerySchema = z.object({
  account_id: bigintId,
  voucher_id: bigintId.optional(),
});

export type PreviousBalanceQuery = z.infer<typeof previousBalanceQuerySchema>;

const paymentMode = z.coerce
  .number()
  .int()
  .refine((value) => (PAYMENT_MODE_IDS as readonly number[]).includes(value), {
    message: 'Must be 1 (transfer), 2 (cash) or 3 (bank)',
  });

const entryDatetime = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/, 'Must be YYYY-MM-DD HH:mm:ss')
  .refine((value) => {
    const [datePart = '', timePart = ''] = value.split(/[ T]/);
    const [hours = 99, minutes = 99, seconds = 0] = timePart.split(':').map(Number);
    return isoDateString.safeParse(datePart).success && hours < 24 && minutes < 60 && seconds < 60;
  }, 'Must be a real date and time');

const voucherFields = {
  primary_account_id: bigintId,
  amount: z.coerce.number().positive(),
  voucher_type_id: voucherTypeId,
  payment_mode: paymentMode,
  entry_datetime: entryDatetime,
  particular: z
    .string()
    .trim()
    .max(255)
    .nullish()
    .transform((value) => value ?? ''),
  secondary_account_id: bigintId.nullish(),
};

type SecondaryRuleInput = {
  payment_mode: number;
  primary_account_id: string;
  secondary_account_id?: string | null;
};

const secondaryIsPresentWhenNeeded = (body: SecondaryRuleInput) =>
  body.payment_mode === PAYMENT_MODE.CASH || Boolean(body.secondary_account_id);

const secondaryDiffersFromPrimary = (body: SecondaryRuleInput) =>
  !body.secondary_account_id || body.secondary_account_id !== body.primary_account_id;

export const createVoucherBodySchema = z
  .object(voucherFields)
  .refine(secondaryIsPresentWhenNeeded, {
    path: ['secondary_account_id'],
    message: 'Required when payment_mode is transfer (1) or bank (3)',
  })
  .refine(secondaryDiffersFromPrimary, {
    path: ['secondary_account_id'],
    message: 'Must differ from primary_account_id',
  });

export const updateVoucherBodySchema = z
  .object({ voucher_id: bigintId, ...voucherFields })
  .refine(secondaryIsPresentWhenNeeded, {
    path: ['secondary_account_id'],
    message: 'Required when payment_mode is transfer (1) or bank (3)',
  })
  .refine(secondaryDiffersFromPrimary, {
    path: ['secondary_account_id'],
    message: 'Must differ from primary_account_id',
  });

export type CreateVoucherBody = z.infer<typeof createVoucherBodySchema>;
export type UpdateVoucherBody = z.infer<typeof updateVoucherBodySchema>;