import express, { type Express } from "express";
import pinoHttp from "pino-http";
import { logger } from "./shared/logger";
import { requestIdMiddleware, sendData } from "./shared/http";
import { errorHandler, notFoundHandler } from "./shared/errors/handler";
import { createAuthenticateMiddleware } from "./shared/security/authenticate.middleware";
import { createIdentityRouter } from "./modules/identity/presentation/identity.router";
import { createEmployeeRouter } from "./modules/identity/presentation/employee.router";
import { createRoleRouter } from "./modules/identity/presentation/role.router";
import { createBranchRouter } from "./modules/identity/presentation/branch.router";
import { createMasterDataRouters, type SimpleMasterDataPrismaClient } from "./modules/master-data/presentation/master-data.routers";
import { createCustomerRouter } from "./modules/master-data/presentation/customer.router";
import { createProductRouter } from "./modules/master-data/presentation/product.router";
import { createSubCategoryRouter } from "./modules/master-data/presentation/sub-category.router";
import type { SimpleMasterDataPrismaDelegate } from "./modules/master-data/infrastructure/simple-master-data-repository.factory";
import type { LoginUseCase } from "./modules/identity/application/login.use-case";
import type { RefreshTokenUseCase, LogoutUseCase } from "./modules/identity/application/refresh-and-logout.use-case";
import type { TokenService } from "./modules/identity/application/token-service.port";
import type { CreateEmployeeUseCase, GetEmployeeUseCase, GetMyEmployeeUseCase, ListEmployeesUseCase, UpdateEmployeeUseCase } from "./modules/identity/application/employee.use-cases";
import type { ProvisionUserUseCase, DeactivateUserUseCase } from "./modules/identity/application/provision-and-deactivate-user.use-case";
import type { ListRolesUseCase, GetRolePermissionsUseCase, ListPermissionsUseCase, UpdateRolePermissionsUseCase } from "./modules/identity/application/role-permission.use-cases";
import type { CreateCustomerUseCase, GetCustomerUseCase, ListCustomersUseCase, UpdateCustomerUseCase, AddCustomerAddressUseCase, DeleteCustomerUseCase } from "./modules/master-data/application/customer.use-cases";
import type { CreateProductUseCase, GetProductUseCase, ListProductsUseCase, UpdateProductUseCase, DeleteProductUseCase } from "./modules/master-data/application/product.use-cases";
import type {
  CreateSubCategoryUseCase,
  GetSubCategoryUseCase,
  ListSubCategoriesUseCase,
  UpdateSubCategoryUseCase,
  DeleteSubCategoryUseCase,
} from "./modules/master-data/application/sub-category.use-cases";
import { createSupplierRouter } from "./modules/procurement/presentation/supplier.router";
import { createPurchaseRequestRouter } from "./modules/procurement/presentation/purchase-request.router";
import { createPurchaseOrderRouter } from "./modules/procurement/presentation/purchase-order.router";
import { createGrnRouter } from "./modules/procurement/presentation/grn.router";
import { createPurchaseInvoiceRouter } from "./modules/procurement/presentation/purchase-invoice.router";
import { createSupplierPaymentRouter } from "./modules/procurement/presentation/supplier-payment.router";
import { createPurchaseReturnRouter } from "./modules/procurement/presentation/purchase-return.router";
import { createApprovalRouter } from "./shared/approval/approval.router";
import type { ApprovalService } from "./shared/approval/approval.service";
import type { CreateSupplierUseCase, GetSupplierUseCase, ListSuppliersUseCase, UpdateSupplierUseCase, AddSupplierContactUseCase, DeleteSupplierUseCase } from "./modules/procurement/application/supplier.use-cases";
import type { CreatePurchaseRequestUseCase, GetPurchaseRequestUseCase, ListPurchaseRequestsUseCase, ApprovePurchaseRequestUseCase, RejectPurchaseRequestUseCase } from "./modules/procurement/application/purchase-request.use-cases";
import type { CreatePurchaseOrderUseCase, GetPurchaseOrderUseCase, ListPurchaseOrdersUseCase } from "./modules/procurement/application/purchase-order.use-cases";
import type { ReceiveGoodsUseCase, GetGrnUseCase, ListGrnsUseCase, ApproveGrnDiscrepancyUseCase, UpdateGrnStatusUseCase } from "./modules/procurement/application/grn.use-cases";
import type { CreatePurchaseInvoiceUseCase, GetPurchaseInvoiceUseCase } from "./modules/procurement/application/purchase-invoice.use-cases";
import type { RecordSupplierPaymentUseCase } from "./modules/procurement/application/supplier-payment.use-case";
import type { CreatePurchaseReturnUseCase, GetPurchaseReturnUseCase, ApprovePurchaseReturnUseCase, RejectPurchaseReturnUseCase } from "./modules/procurement/application/purchase-return.use-cases";
import { createSalesRouter, type SalesRouterDependencies } from "./modules/sales/presentation/sales.router";
import { createInventoryRouter, type InventoryRouterDependencies } from "./modules/inventory/presentation/inventory.router";
import { createServiceRouter, type ServiceRouterDependencies } from "./modules/service/presentation/service.router";

export interface AppDependencies {
  identity?: {
    loginUseCase: LoginUseCase;
    refreshTokenUseCase: RefreshTokenUseCase;
    logoutUseCase: LogoutUseCase;
  };
  // §58/§59's management endpoints — separate from `identity` above
  // because they need `authenticate` in front of them (auth's own
  // endpoints obviously can't require a token to log in with) and a
  // `tokenService` to build that middleware from.
  employeeAndRoleManagement?: {
    tokenService: TokenService;
    createEmployeeUseCase: CreateEmployeeUseCase;
    getEmployeeUseCase: GetEmployeeUseCase;
    getMyEmployeeUseCase: GetMyEmployeeUseCase;
    listEmployeesUseCase: ListEmployeesUseCase;
    updateEmployeeUseCase: UpdateEmployeeUseCase;
    provisionUserUseCase: ProvisionUserUseCase;
    deactivateUserUseCase: DeactivateUserUseCase;
    listRolesUseCase: ListRolesUseCase;
    getRolePermissionsUseCase: GetRolePermissionsUseCase;
    listPermissionsUseCase: ListPermissionsUseCase;
    updateRolePermissionsUseCase: UpdateRolePermissionsUseCase;
  };
  // Phase 3 (prompt.md §187) — Master Data. `tokenService` again, for the
  // same reason as employeeAndRoleManagement's own copy: this whole group
  // sits behind `authenticate` too.
  masterData?: {
    tokenService: TokenService;
    branchPrismaDelegate: SimpleMasterDataPrismaDelegate; // §61 Company/Branch/Department — Branch reuses modules/master-data's generic factory directly (see branch.router.ts), so app.ts just needs to pass its Prisma delegate through, not a full use-case bundle like the others below
    simpleMasterDataPrisma: SimpleMasterDataPrismaClient; // Category/Brand/Unit/Warehouse/Department/TaxRate — six generic resources built from one Prisma client
    customer: {
      createCustomerUseCase: CreateCustomerUseCase;
      getCustomerUseCase: GetCustomerUseCase;
      listCustomersUseCase: ListCustomersUseCase;
      updateCustomerUseCase: UpdateCustomerUseCase;
      addCustomerAddressUseCase: AddCustomerAddressUseCase;
      deleteCustomerUseCase: DeleteCustomerUseCase;
    };
    product: {
      createProductUseCase: CreateProductUseCase;
      getProductUseCase: GetProductUseCase;
      listProductsUseCase: ListProductsUseCase;
      updateProductUseCase: UpdateProductUseCase;
      deleteProductUseCase: DeleteProductUseCase;
    };
    subCategory?: {
      createSubCategoryUseCase: CreateSubCategoryUseCase;
      getSubCategoryUseCase: GetSubCategoryUseCase;
      listSubCategoriesUseCase: ListSubCategoriesUseCase;
      updateSubCategoryUseCase: UpdateSubCategoryUseCase;
      deleteSubCategoryUseCase: DeleteSubCategoryUseCase;
    };
  };
  // Phase 4 (prompt.md §188, in progress) — Procurement. Supplier +
  // Purchase Requisition built this session; Purchase Order/GRN/Purchase
  // Invoice/Supplier Payment/Purchase Return not yet (see HANDOFF.md).
  procurement?: {
    tokenService: TokenService;
    approvalService: ApprovalService; // shared/approval — also reusable by any future module before Phase 9
    supplier: {
      createSupplierUseCase: CreateSupplierUseCase;
      getSupplierUseCase: GetSupplierUseCase;
      listSuppliersUseCase: ListSuppliersUseCase;
      updateSupplierUseCase: UpdateSupplierUseCase;
      addSupplierContactUseCase: AddSupplierContactUseCase;
      deleteSupplierUseCase: DeleteSupplierUseCase;
    };
    purchaseRequest: {
      createPurchaseRequestUseCase: CreatePurchaseRequestUseCase;
      getPurchaseRequestUseCase: GetPurchaseRequestUseCase;
      listPurchaseRequestsUseCase: ListPurchaseRequestsUseCase;
      approvePurchaseRequestUseCase: ApprovePurchaseRequestUseCase;
      rejectPurchaseRequestUseCase: RejectPurchaseRequestUseCase;
    };
    purchaseOrder: {
      createPurchaseOrderUseCase: CreatePurchaseOrderUseCase;
      getPurchaseOrderUseCase: GetPurchaseOrderUseCase;
      listPurchaseOrdersUseCase: ListPurchaseOrdersUseCase;
    };
    grn: {
      receiveGoodsUseCase: ReceiveGoodsUseCase;
      getGrnUseCase: GetGrnUseCase;
      listGrnsUseCase: ListGrnsUseCase;
      approveGrnDiscrepancyUseCase?: ApproveGrnDiscrepancyUseCase;
      updateGrnStatusUseCase?: UpdateGrnStatusUseCase;
    };
    purchaseInvoice: {
      createPurchaseInvoiceUseCase: CreatePurchaseInvoiceUseCase;
      getPurchaseInvoiceUseCase: GetPurchaseInvoiceUseCase;
    };
    supplierPayment: {
      recordSupplierPaymentUseCase: RecordSupplierPaymentUseCase;
    };
    purchaseReturn: {
      createPurchaseReturnUseCase: CreatePurchaseReturnUseCase;
      getPurchaseReturnUseCase: GetPurchaseReturnUseCase;
      approvePurchaseReturnUseCase: ApprovePurchaseReturnUseCase;
      rejectPurchaseReturnUseCase: RejectPurchaseReturnUseCase;
    };
  };
  sales?: {
    tokenService: TokenService;
  } & SalesRouterDependencies;
  inventory?: {
    tokenService: TokenService;
  } & InventoryRouterDependencies;
  service?: {
    tokenService: TokenService;
  } & ServiceRouterDependencies;
}

// Phase 2 (prompt.md §186): Identity & RBAC's auth endpoints are now real.
// `deps` is optional so Phase 0's original smoke tests (app.test.ts,
// createApp() with no arguments) keep passing unchanged — a test that only
// cares about /health has no reason to also construct a full identity
// stack. server.ts always passes real deps at actual runtime.
export function createApp(deps: AppDependencies = {}): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Liveness/readiness probe for Docker Compose (architecture.md §38's
  // health-check strategy) and frontend proxy check (/api/v1/health)
  app.get(["/health", "/api/v1/health"], (_req, res) => {
    sendData(res, { status: "ok", service: "@bts/api", timestamp: new Date().toISOString() });
  });

  if (deps.identity) {
    app.use("/api/v1", createIdentityRouter(deps.identity));
  }

  if (deps.employeeAndRoleManagement) {
    const m = deps.employeeAndRoleManagement;
    const authenticate = createAuthenticateMiddleware(m.tokenService);
    app.use(
      "/api/v1",
      authenticate,
      createEmployeeRouter(m),
      createRoleRouter(m)
    );
  }

  if (deps.masterData) {
    const md = deps.masterData;
    const authenticate = createAuthenticateMiddleware(md.tokenService);
    const subCatRouter = md.subCategory ? [createSubCategoryRouter(md.subCategory)] : [];
    app.use(
      "/api/v1",
      authenticate,
      createBranchRouter(md.branchPrismaDelegate),
      ...createMasterDataRouters(md.simpleMasterDataPrisma),
      createCustomerRouter(md.customer),
      createProductRouter(md.product),
      ...subCatRouter
    );
  }

  if (deps.procurement) {
    const pc = deps.procurement;
    const authenticate = createAuthenticateMiddleware(pc.tokenService);
    app.use(
      "/api/v1",
      authenticate,
      createSupplierRouter(pc.supplier),
      createPurchaseRequestRouter(pc.purchaseRequest),
      createPurchaseOrderRouter(pc.purchaseOrder),
      createGrnRouter(pc.grn),
      createPurchaseInvoiceRouter(pc.purchaseInvoice),
      createSupplierPaymentRouter(pc.supplierPayment),
      createPurchaseReturnRouter(pc.purchaseReturn),
      createApprovalRouter(pc.approvalService)
    );
  }

  if (deps.sales) {
    const sl = deps.sales;
    const authenticate = createAuthenticateMiddleware(sl.tokenService);
    app.use("/api/v1", authenticate, createSalesRouter(sl));
  }

  if (deps.inventory) {
    const inv = deps.inventory;
    const authenticate = createAuthenticateMiddleware(inv.tokenService);
    app.use("/api/v1", authenticate, createInventoryRouter(inv));
  }

  if (deps.service) {
    const srv = deps.service;
    const authenticate = createAuthenticateMiddleware(srv.tokenService);
    app.use("/api/v1", authenticate, createServiceRouter(srv));
  }

  // Every other module router (prompt.md §57-127) mounts here the same way,
  // one `apps/api/src/modules/<context>/presentation` router at a time,
  // starting with Phase 4 onward.

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
