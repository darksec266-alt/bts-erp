import { Router } from "express";
import type { Request, Response } from "express";
import { sendData, sendError } from "../../../shared/http";
import { requirePermission } from "../../../shared/security/require-permission.middleware";
import {
  CreateCustomerUseCase,
  DuplicatePhoneError,
  GetCustomerUseCase,
  ListCustomersUseCase,
  UpdateCustomerUseCase,
  AddCustomerAddressUseCase,
  DeleteCustomerUseCase,
  GetCustomerProfileUseCase,
  TopupCustomerWalletUseCase,
  PayInvoiceFromWalletUseCase,
} from "../application/customer.use-cases";
import { SimpleMasterDataNotFoundError, EntityInUseError } from "../domain/simple-master-data.types";

function isPrismaUniqueConstraint(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "P2002";
}

// prd.md §8.2 / api-spec.md §13. "R" on masterData (e.g. Sales Executive,
// prd.md §6.1) can look customers up but not create/edit/delete them —
// same view/manage split as modules/master-data's generic six resources.
export function createCustomerRouter(deps: {
  createCustomerUseCase: CreateCustomerUseCase;
  getCustomerUseCase: GetCustomerUseCase;
  listCustomersUseCase: ListCustomersUseCase;
  updateCustomerUseCase: UpdateCustomerUseCase;
  addCustomerAddressUseCase: AddCustomerAddressUseCase;
  deleteCustomerUseCase: DeleteCustomerUseCase;
  getCustomerProfileUseCase?: GetCustomerProfileUseCase;
  topupCustomerWalletUseCase?: TopupCustomerWalletUseCase;
  payInvoiceFromWalletUseCase?: PayInvoiceFromWalletUseCase;
}): Router {
  const router = Router();

  router.post("/customers", requirePermission("masterData.manage"), async (req: Request, res: Response) => {
    const { customerCode, displayName, phone, branchId, isServiceOnly, addresses } = req.body ?? {};
    if (![customerCode, displayName, phone, branchId].every((v) => typeof v === "string" && v.length > 0)) {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "customerCode, displayName, phone, and branchId are required." });
      return;
    }
    try {
      const customer = await deps.createCustomerUseCase.execute({ customerCode, displayName, phone, branchId, isServiceOnly, addresses });
      sendData(res, customer, 201);
    } catch (err: unknown) {
      if (err instanceof DuplicatePhoneError) {
        sendError(res, 409, { code: "DUPLICATE_PHONE", message: err.message });
        return;
      }
      if (isPrismaUniqueConstraint(err)) {
        sendError(res, 409, { code: "DUPLICATE", message: "A customer with this code or phone number already exists." });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to create customer";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.get("/customers", requirePermission("masterData.view", "masterData.manage"), async (req: Request, res: Response) => {
    try {
      const { branchId, isActive, isServiceOnly, search, skip, take } = req.query;
      const result = await deps.listCustomersUseCase.execute(
        {
          branchId: typeof branchId === "string" ? branchId : undefined,
          isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
          isServiceOnly: isServiceOnly === "true" ? true : isServiceOnly === "false" ? false : undefined,
          search: typeof search === "string" && search.trim().length > 0 ? search.trim() : undefined,
        },
        { skip: Number(skip) || 0, take: Math.min(Number(take) || 20, 500) }
      );
      sendData(res, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to list customers";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.get("/customers/:id", requirePermission("masterData.view", "masterData.manage"), async (req: Request, res: Response) => {
    try {
      sendData(res, await deps.getCustomerUseCase.execute(req.params.id!));
    } catch (err: unknown) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to get customer";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.patch("/customers/:id", requirePermission("masterData.manage"), async (req: Request, res: Response) => {
    try {
      sendData(res, await deps.updateCustomerUseCase.execute(req.params.id!, req.body ?? {}));
    } catch (err: unknown) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      if (err instanceof DuplicatePhoneError) {
        sendError(res, 409, { code: "DUPLICATE_PHONE", message: err.message });
        return;
      }
      if (isPrismaUniqueConstraint(err)) {
        sendError(res, 409, { code: "DUPLICATE", message: "A customer with this code or phone number already exists." });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to update customer";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.post("/customers/:id/addresses", requirePermission("masterData.manage"), async (req: Request, res: Response) => {
    const { label, addressLine } = req.body ?? {};
    if (typeof label !== "string" || typeof addressLine !== "string") {
      sendError(res, 422, { code: "VALIDATION_ERROR", message: "label and addressLine are required." });
      return;
    }
    try {
      sendData(res, await deps.addCustomerAddressUseCase.execute(req.params.id!, { label, addressLine }), 201);
    } catch (err: unknown) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to add address";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  router.delete("/customers/:id", requirePermission("masterData.manage"), async (req: Request, res: Response) => {
    try {
      await deps.deleteCustomerUseCase.execute(req.params.id!);
      sendData(res, { deleted: true });
    } catch (err: unknown) {
      if (err instanceof SimpleMasterDataNotFoundError) {
        sendError(res, 404, { code: "NOT_FOUND", message: err.message });
        return;
      }
      if (err instanceof EntityInUseError) {
        sendError(res, 422, { code: "ENTITY_IN_USE", message: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to delete customer";
      sendError(res, 500, { code: "INTERNAL_ERROR", message });
    }
  });

  // Customer Profile: Complete 360-degree view (Financial summary, Invoices, Returns, Payments, Wallet ledger)
  router.get(
    "/customers/:id/profile",
    requirePermission("masterData.view", "masterData.manage", "sales.view", "sales.manage"),
    async (req: Request, res: Response) => {
      try {
        if (!deps.getCustomerProfileUseCase) {
          sendError(res, 501, { code: "NOT_IMPLEMENTED", message: "Customer profile not configured." });
          return;
        }
        const profile = await deps.getCustomerProfileUseCase.execute(req.params.id!);
        sendData(res, profile);
      } catch (err: unknown) {
        if (err instanceof SimpleMasterDataNotFoundError) {
          sendError(res, 404, { code: "NOT_FOUND", message: err.message });
          return;
        }
        const message = err instanceof Error ? err.message : "Failed to get customer profile";
        sendError(res, 500, { code: "INTERNAL_ERROR", message });
      }
    }
  );

  // Customer Wallet Top-up
  router.post(
    "/customers/:id/wallet/topup",
    requirePermission("masterData.manage", "sales.manage"),
    async (req: Request, res: Response) => {
      try {
        if (!deps.topupCustomerWalletUseCase) {
          sendError(res, 501, { code: "NOT_IMPLEMENTED", message: "Wallet topup not configured." });
          return;
        }
        const { amount, notes } = req.body ?? {};
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          sendError(res, 422, { code: "VALIDATION_ERROR", message: "amount must be a positive number." });
          return;
        }
        const userId = (req as any).user?.id;
        const result = await deps.topupCustomerWalletUseCase.execute(req.params.id!, parsedAmount, notes, userId);
        sendData(res, result, 201);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to top up customer wallet";
        sendError(res, 400, { code: "TOPUP_FAILED", message });
      }
    }
  );

  // Pay Invoice Due from Customer Wallet
  router.post(
    "/customers/:id/wallet/pay-invoice",
    requirePermission("masterData.manage", "sales.manage"),
    async (req: Request, res: Response) => {
      try {
        if (!deps.payInvoiceFromWalletUseCase) {
          sendError(res, 501, { code: "NOT_IMPLEMENTED", message: "Wallet invoice payment not configured." });
          return;
        }
        const { invoiceId, amount, notes } = req.body ?? {};
        if (!invoiceId || typeof invoiceId !== "string") {
          sendError(res, 422, { code: "VALIDATION_ERROR", message: "invoiceId is required." });
          return;
        }
        const parsedAmount = Number(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          sendError(res, 422, { code: "VALIDATION_ERROR", message: "amount must be a positive number." });
          return;
        }
        const userId = (req as any).user?.id;
        const result = await deps.payInvoiceFromWalletUseCase.execute(req.params.id!, invoiceId, parsedAmount, notes, userId);
        sendData(res, result, 200);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to pay invoice from wallet";
        sendError(res, 400, { code: "PAYMENT_FAILED", message });
      }
    }
  );

  return router;
}
