import type { VoucherDetailsRow } from "../repositories/voucher.repository.js";
import { PAYMENT_MODE } from "../constants/voucher.js";
import { notFound } from "../errors/appError.js";
import {
  findVoucherList,
  findVoucherDetails,
  findPreviousBalance,
  insertVoucher,
  updateVoucherRecord,
  deleteVoucherRecord
} from "../repositories/voucher.repository.js";
import type {
  ListVouchersQuery,
  PreviousBalanceQuery,
  CreateVoucherBody,
  UpdateVoucherBody
} from "../validators/voucher.validator.js";

export async function listVouchers(businessId: number | string, query: ListVouchersQuery) {
  const rows = await findVoucherList(businessId, query);
    const totalCount = Number(rows[0]?.total_count ?? 0);
  const nextOffset = query.offset + rows.length;

  return {
    total_count: totalCount,
    data: rows,
    pagination: {
      limit: query.limit,
      offset: query.offset,
      next_offset: nextOffset,
      has_more: nextOffset < totalCount,
    },
  };
}

const CASH_ACCOUNT_LEDGER_TYPE_HIDDEN_EXCEPT = 6;

function hideSecondaryAccount(row: VoucherDetailsRow): VoucherDetailsRow {
  return {
    ...row,
    secondary_account_id: null,
    secondary_account_no: "",
    secondary_account_name: "",
    secondary_account_email: "",
    secondary_account_mobile: "",
    secondary_account_whatsapp: "",
    secondary_account_address: "",
    secondary_account_contact_person: "",
    secondary_account_reference: "",
    secondary_account_id_card: "",
    secondary_account_tax_no: "",
    secondary_account_is_active: false,
    secondary_previous_balance: 0,
    secondary_current_balance: 0,
  };
}

export async function getVoucherDetails(businessId: number | string, voucherId: string) {
  const row = await findVoucherDetails(voucherId);

  if (!row || String(row.business_id) !== String(businessId)) {
    throw notFound("Voucher not found");
  }

  const hideSecondary =
    row.account_ledger_type_id !== CASH_ACCOUNT_LEDGER_TYPE_HIDDEN_EXCEPT &&
    row.payment_mode_id === PAYMENT_MODE.CASH;

  return hideSecondary ? hideSecondaryAccount(row) : row;
}

export async function getPreviousBalance(query: PreviousBalanceQuery) {
  const previousBalance = await findPreviousBalance(query.account_id, query.voucher_id ?? null);
  return { previous_balance: previousBalance };
}

export async function createVoucher(businessId: number | string, userId: number | string, body: CreateVoucherBody) {
  const voucherId = await insertVoucher(businessId, userId, body);
  return { voucher_id: voucherId };
}

export async function updateVoucher(businessId: number | string, userId: number | string, body: UpdateVoucherBody) {
  const existing = await findVoucherDetails(body.voucher_id);

  if (!existing || String(existing.business_id) !== String(businessId)) {
    throw notFound("Voucher not found");
  }

  await updateVoucherRecord(businessId, userId, body);
  return { voucher_id: body.voucher_id };
}

export async function deleteVoucher(businessId: number | string, userId: number | string, voucherId: string) {
  const existing = await findVoucherDetails(voucherId);

  if (!existing || String(existing.business_id) !== String(businessId)) {
    throw notFound("Voucher not found");
  }

  await deleteVoucherRecord(businessId, userId, voucherId);
  return { voucher_id: voucherId };
}