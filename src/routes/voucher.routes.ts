import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import {
  listVouchersQuerySchema,
  voucherIdParamsSchema,
  previousBalanceQuerySchema,
  createVoucherBodySchema,
  updateVoucherBodySchema
} from "../validators/voucher.validator.js";
import {
  listVouchersHandler,
  getVoucherDetailsHandler,
  getPreviousBalanceHandler,
  createVoucherHandler,
  updateVoucherHandler,
  deleteVoucherHandler
} from "../controllers/voucher.controller.js";

export const voucherRouter = Router();

voucherRouter.get(
  "/get-voucher-list",
  authenticate,
  validate({ query: listVouchersQuerySchema }),
  listVouchersHandler,
);

voucherRouter.get(
  "/get-voucher-details/:voucher_id",
  authenticate,
  validate({ params: voucherIdParamsSchema }),
  getVoucherDetailsHandler,
);

voucherRouter.get(
  "/get-previous-balance",
  authenticate,
  validate({ query: previousBalanceQuerySchema }),
  getPreviousBalanceHandler,
);

voucherRouter.post(
  "/create-voucher",
  authenticate,
  validate({ body: createVoucherBodySchema }),
  createVoucherHandler,
);

voucherRouter.put(
  "/update-voucher",
  authenticate,
  validate({ body: updateVoucherBodySchema }),
  updateVoucherHandler,
);

voucherRouter.delete(
  "/delete-voucher/:voucher_id",
  authenticate,
  validate({ params: voucherIdParamsSchema }),
  deleteVoucherHandler,
);