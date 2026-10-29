export const VOUCHER_TYPE = {
  RECEIPT: 2,
  PAYMENT: 3,
  JOURNAL: 4,
} as const;

export const PAYMENT_MODE = {
  TRANSFER: 1,
  CASH: 2,
  BANK: 3,
} as const;

export type VoucherTypeId = (typeof VOUCHER_TYPE)[keyof typeof VOUCHER_TYPE];
export type PaymentModeId = (typeof PAYMENT_MODE)[keyof typeof PAYMENT_MODE];

export const VOUCHER_TYPE_IDS = Object.values(VOUCHER_TYPE);
export const PAYMENT_MODE_IDS = Object.values(PAYMENT_MODE);