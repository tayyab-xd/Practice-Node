import type { Request, Response } from "express";
import { getAuth } from "../middlewares/authenticate.js";
import {
  listVouchers,
  getVoucherDetails,
  getPreviousBalance,
  createVoucher,
  updateVoucher,
  deleteVoucher
} from "../services/voucher.service.js";
import type {
  ListVouchersQuery,
  VoucherIdParams,
  PreviousBalanceQuery,
  CreateVoucherBody,
  UpdateVoucherBody
} from "../validators/voucher.validator.js";

export async function listVouchersHandler(req: Request, res: Response): Promise<void> {
  const { business_id } = getAuth(req);
  const query = req.query as unknown as ListVouchersQuery;

  const result = await listVouchers(business_id, query);

  res.status(200).json({ success: true, ...result });
}

export async function getVoucherDetailsHandler(req: Request, res: Response): Promise<void> {
  const { business_id } = getAuth(req);
  const { voucher_id } = req.params as unknown as VoucherIdParams;

  const data = await getVoucherDetails(business_id, voucher_id);

  res.status(200).json({ success: true, data });
}


export async function getPreviousBalanceHandler(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as PreviousBalanceQuery;

  const data = await getPreviousBalance(query);

  res.status(200).json({ success: true, data });
}

export async function createVoucherHandler(req: Request, res: Response): Promise<void> {
  const { business_id, user_id } = getAuth(req);
  const body = req.body as CreateVoucherBody;

  const data = await createVoucher(business_id, user_id, body);

  res.status(201).json({ success: true, data });
}

export async function updateVoucherHandler(req: Request, res: Response): Promise<void> {
  const { business_id, user_id } = getAuth(req);
  const body = req.body as UpdateVoucherBody;

  const data = await updateVoucher(business_id, user_id, body);

  res.status(200).json({ success: true, data });
}

export async function deleteVoucherHandler(req: Request, res: Response): Promise<void> {
  const { business_id, user_id } = getAuth(req);
  const { voucher_id } = req.params as unknown as VoucherIdParams;

  const data = await deleteVoucher(business_id, user_id, voucher_id);

  res.status(200).json({ success: true, data });
}