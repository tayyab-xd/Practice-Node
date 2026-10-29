import { executeFunction } from '../utils/executeFunction.js';
import type { ListVouchersQuery, CreateVoucherBody, UpdateVoucherBody } from '../validators/voucher.validator.js';

export type VoucherListRow = {
  total_count: string;
  voucher_id: string;
  voucher_no: string;
  voucher_year: number;
  voucher_type_id: number;
  payment_mode_id: number;
  payment_mode: string;
  voucher_datetime: string;
  entry_datetime: string;
  deleted: boolean;
  account_id: string;
  account_no: string;
  account_name: string;
  mobile: string;
  address: string;
  ledger_id: string;
  ledger_type_id: number;
  ledger_particular: string;
  debit: number;
  credit: number;
  remarks: string;
};

export async function findVoucherList(
  businessId: number | string,
  query: ListVouchersQuery,
): Promise<VoucherListRow[]> {
  return executeFunction<VoucherListRow>('vouchers_fn_select_list', [
    businessId,
    query.limit,
    query.offset,
    query.search,
    query.voucher_type_id ?? null,
    query.date_from ?? null,
    query.date_to ?? null,
  ]);
}

export type VoucherDetailsRow = {
  business_id: string;
  business_name: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  business_logo: string;
  business_whatsapp: string;
  business_tax_no: string;
  business_is_active: boolean;
  currency_code: string;
  currency_symbol: string;
  voucher_id: string;
  voucher_no: string;
  voucher_year: number;
  voucher_datetime: string;
  entry_datetime: string;
  payment_mode_id: number;
  voucher_type_id: number;
  voucher_type: string;
  voucher_abbrv: string;
  primary_account_id: string;
  primary_account_no: string;
  primary_account_name: string;
  primary_account_email: string;
  primary_account_mobile: string;
  primary_account_whatsapp: string;
  primary_account_address: string;
  primary_account_contact_person: string;
  primary_account_reference: string;
  primary_account_id_card: string;
  primary_account_tax_no: string;
  primary_account_is_active: boolean;
  secondary_account_id: string | null;
  secondary_account_no: string;
  secondary_account_name: string;
  secondary_account_email: string;
  secondary_account_mobile: string;
  secondary_account_whatsapp: string;
  secondary_account_address: string;
  secondary_account_contact_person: string;
  secondary_account_reference: string;
  secondary_account_id_card: string;
  secondary_account_tax_no: string;
  secondary_account_is_active: boolean;
  amount: number;
  particular: string;
  account_ledger_type_id: number;
  bank_ledger_type_id: number;
  primary_previous_balance: number;
  primary_current_balance: number;
  secondary_previous_balance: number;
  secondary_current_balance: number;
};

export async function findVoucherDetails(voucherId: string): Promise<VoucherDetailsRow | undefined> {
  const rows = await executeFunction<VoucherDetailsRow>("vouchers_fn_select_complete_details", [voucherId]);
  return rows[0];
}

export async function findPreviousBalance(accountId: string, voucherId: string | null): Promise<number> {
  const rows = await executeFunction<{ balance_fn_previous_sum: number | null }>("balance_fn_previous_sum", [
    accountId,
    voucherId,
  ]);
  return Number(rows[0]?.balance_fn_previous_sum ?? 0);
}

export async function insertVoucher(
  businessId: number | string,
  userId: number | string,
  body: CreateVoucherBody,
): Promise<string> {
  const rows = await executeFunction<{ vouchers_fn_insert: string | number | null }>('vouchers_fn_insert', [
    businessId,
    userId,
    body.primary_account_id,
    body.amount,
    body.voucher_type_id,
    body.payment_mode,
    body.entry_datetime,
    body.particular,
    body.secondary_account_id ?? null,
  ]);

  const voucherId = rows[0]?.vouchers_fn_insert;
  if (voucherId === null || voucherId === undefined) {
    throw new Error('vouchers_fn_insert returned no voucher id');
  }
  return String(voucherId);
}

export async function updateVoucherRecord(
  businessId: number | string,
  userId: number | string,
  body: UpdateVoucherBody,
): Promise<void> {
  await executeFunction<Record<string, unknown>>('vouchers_fn_update', [
    body.voucher_id,
    businessId,
    userId,
    body.primary_account_id,
    body.amount,
    body.voucher_type_id,
    body.payment_mode,
    body.particular,
    body.secondary_account_id ?? null,
    body.entry_datetime,
  ]);
}

export async function deleteVoucherRecord(
  businessId: number | string,
  userId: number | string,
  voucherId: string,
): Promise<void> {
  await executeFunction<Record<string, unknown>>('vouchers_fn_delete', [voucherId, businessId, userId]);
}