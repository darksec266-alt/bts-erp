import { loadEnv } from "@bts/config";
import { createApp, type AppDependencies } from "./app";
import { logger } from "./shared/logger";
import { BcryptPasswordHasher } from "./modules/identity/infrastructure/bcrypt-password-hasher";
import { JwtTokenService } from "./modules/identity/infrastructure/jwt-token-service";
import { TotpMfaService } from "./modules/identity/infrastructure/totp-mfa-service";
import { PrismaUserRepository, PrismaRefreshTokenRepository, type IdentityPrismaClient } from "./modules/identity/infrastructure/prisma-identity-repositories";
import { PrismaEmployeeRepository, type EmployeePrismaClient } from "./modules/identity/infrastructure/prisma-employee-repository";
import { PrismaRolePermissionRepository, type RolePermissionPrismaClient } from "./modules/identity/infrastructure/prisma-role-permission-repository";
import { PrismaAuditLogWriter, type AuditLogPrismaClient } from "./shared/audit/prisma-audit-log-writer";
import { ConsoleCredentialNotifier } from "./modules/identity/application/credential-notifier.port";
import type { SimpleMasterDataPrismaClient } from "./modules/master-data/presentation/master-data.routers";
import { PrismaCustomerRepository, type CustomerPrismaClient } from "./modules/master-data/infrastructure/prisma-customer-repository";
import { PrismaProductRepository, type ProductPrismaClient } from "./modules/master-data/infrastructure/prisma-product-repository";
import { PrismaSubCategoryRepository, type SubCategoryPrismaClient } from "./modules/master-data/infrastructure/prisma-sub-category-repository";
import { CreateCustomerUseCase, GetCustomerUseCase, ListCustomersUseCase, UpdateCustomerUseCase, AddCustomerAddressUseCase, DeleteCustomerUseCase } from "./modules/master-data/application/customer.use-cases";
import { CreateProductUseCase, GetProductUseCase, ListProductsUseCase, UpdateProductUseCase, DeleteProductUseCase } from "./modules/master-data/application/product.use-cases";
import {
  CreateSubCategoryUseCase,
  GetSubCategoryUseCase,
  ListSubCategoriesUseCase,
  UpdateSubCategoryUseCase,
  DeleteSubCategoryUseCase,
} from "./modules/master-data/application/sub-category.use-cases";
import { PrismaSupplierRepository, type SupplierPrismaClient } from "./modules/procurement/infrastructure/prisma-supplier-repository";
import { PrismaPurchaseRequestRepository, type PurchaseRequestPrismaClient } from "./modules/procurement/infrastructure/prisma-purchase-request-repository";
import { PrismaPurchaseOrderRepository, type PurchaseOrderPrismaClient } from "./modules/procurement/infrastructure/prisma-purchase-order-repository";
import { PrismaGrnRepository, type GrnPrismaClient } from "./modules/procurement/infrastructure/prisma-grn-repository";
import { PrismaPurchaseInvoiceRepository, type PurchaseInvoicePrismaClient } from "./modules/procurement/infrastructure/prisma-purchase-invoice-repository";
import { PrismaSupplierPaymentRepository, type SupplierPaymentPrismaClient } from "./modules/procurement/infrastructure/prisma-supplier-payment-repository";
import { PrismaPurchaseReturnRepository, type PurchaseReturnPrismaClient } from "./modules/procurement/infrastructure/prisma-purchase-return-repository";
import { CreateSupplierUseCase, GetSupplierUseCase, ListSuppliersUseCase, UpdateSupplierUseCase, AddSupplierContactUseCase, DeleteSupplierUseCase } from "./modules/procurement/application/supplier.use-cases";
import { CreatePurchaseRequestUseCase, GetPurchaseRequestUseCase, ListPurchaseRequestsUseCase, ApprovePurchaseRequestUseCase, RejectPurchaseRequestUseCase } from "./modules/procurement/application/purchase-request.use-cases";
import { CreatePurchaseOrderUseCase, GetPurchaseOrderUseCase, ListPurchaseOrdersUseCase } from "./modules/procurement/application/purchase-order.use-cases";
import { ReceiveGoodsUseCase, GetGrnUseCase, ListGrnsUseCase, ApproveGrnDiscrepancyUseCase, UpdateGrnStatusUseCase, CancelGrnUseCase } from "./modules/procurement/application/grn.use-cases";
import { CreatePurchaseInvoiceUseCase, GetPurchaseInvoiceUseCase } from "./modules/procurement/application/purchase-invoice.use-cases";
import { RecordSupplierPaymentUseCase } from "./modules/procurement/application/supplier-payment.use-case";
import { CreatePurchaseReturnUseCase, GetPurchaseReturnUseCase, ApprovePurchaseReturnUseCase, RejectPurchaseReturnUseCase } from "./modules/procurement/application/purchase-return.use-cases";
import { ApprovalService } from "./shared/approval/approval.service";
import { PrismaApprovalRequestRepository, type ApprovalRequestPrismaClient } from "./shared/approval/prisma-approval-request-repository";
import { LoginUseCase } from "./modules/identity/application/login.use-case";
import { RefreshTokenUseCase, LogoutUseCase } from "./modules/identity/application/refresh-and-logout.use-case";
import { CreateEmployeeUseCase, GetEmployeeUseCase, GetMyEmployeeUseCase, ListEmployeesUseCase, UpdateEmployeeUseCase } from "./modules/identity/application/employee.use-cases";
import { ProvisionUserUseCase, DeactivateUserUseCase } from "./modules/identity/application/provision-and-deactivate-user.use-case";
import { ListRolesUseCase, GetRolePermissionsUseCase, ListPermissionsUseCase, UpdateRolePermissionsUseCase } from "./modules/identity/application/role-permission.use-cases";
import { PrismaSalesRepository, type SalesPrismaClient } from "./modules/sales/infrastructure/prisma-sales-repository";
import {
  CreateQuotationUseCase,
  GetQuotationUseCase,
  ListQuotationsUseCase,
  UpdateQuotationStatusUseCase,
  CreateSalesOrderUseCase,
  GetSalesOrderUseCase,
  ListSalesOrdersUseCase,
  ConvertQuotationToSalesOrderUseCase,
  CreateDeliveryChallanUseCase,
  ListDeliveryChallansUseCase,
  CreateInvoiceFromChallansUseCase,
  GetInvoiceUseCase,
  ListInvoicesUseCase,
  GetSalesStatsUseCase,
  CreateProjectUseCase,
  GetProjectUseCase,
  ListProjectsUseCase,
  UpdateProjectStatusUseCase,
  AddProjectItemUseCase,
  RemoveProjectItemUseCase,
  CreateDirectSaleUseCase,
  CreateDeliveryChallanReturnUseCase,
  ListDeliveryChallanReturnsUseCase,
  GetSalesOrderFulfillmentUseCase,
  CreateCreditNoteUseCase,
  ListCreditNotesUseCase,
  CreateCustomerAdvanceUseCase,
  GetCustomerAdvanceUseCase,
  ListCustomerAdvancesUseCase,
  AdjustCustomerAdvanceUseCase,
  RecordPaymentUseCase,
  ListPaymentsUseCase,
  CreateBankTransactionProofUseCase,
  GetBankTransactionProofUseCase,
} from "./modules/sales/application/sales.use-cases";

import { PrismaInventoryRepository } from "./modules/inventory/infrastructure/prisma-inventory-repository";
import {
  ListStockUseCase,
  GetInventoryStatsUseCase,
  CreateStockAdjustmentUseCase,
  ListStockAdjustmentsUseCase,
  CreateStockTransferUseCase,
  ReceiveStockTransferUseCase,
  ListStockTransfersUseCase,
  CreateBatchUseCase,
  ListBatchesUseCase,
  CreateSerialNumberUseCase,
  GetSerialHistoryUseCase,
  ListSerialNumbersUseCase,
  ScanBarcodeUseCase,
  CreateDamageLossReportUseCase,
  ApproveDamageLossReportUseCase,
  ListDamageLossReportsUseCase,
} from "./modules/inventory/application/inventory.use-cases";

import { PrismaServiceRepository, type ServicePrismaClient } from "./modules/service/infrastructure/prisma-service-repository";
import {
  CreateTicketUseCase,
  GetTicketUseCase,
  ListTicketsUseCase,
  CreateServiceQuotationUseCase,
  CreateServiceAssignmentUseCase,
  GetServiceAssignmentUseCase,
  ListServiceAssignmentsUseCase,
  AssignTechnicianUseCase,
  UpdateAssignmentStatusUseCase,
  IssueProductCustodyUseCase,
  UpdateProductCustodyStatusUseCase,
  ListProductCustodyUseCase,
  IssueTechnicianAdvanceUseCase,
  ListTechnicianAdvancesUseCase,
  SubmitConveyanceBillUseCase,
  ApproveConveyanceBillUseCase,
  RejectConveyanceBillUseCase,
  ListConveyanceBillsUseCase,
  RecordGpsCheckinUseCase,
  ListLiveLocationLogsUseCase,
  CloseServiceAssignmentUseCase,
  GetServicePnlUseCase,
  CreateWarrantyUseCase,
  GetWarrantyUseCase,
  ListWarrantiesUseCase,
  CreateWarrantyClaimUseCase,
  ListWarrantyClaimsUseCase,
  GetServiceStatsUseCase,
} from "./modules/service/application/service.use-cases";

import type { SimpleMasterDataPrismaDelegate } from "./modules/master-data/infrastructure/simple-master-data-repository.factory";

const env = loadEnv();

// One combined structural type spanning every repository's own narrower
// interface — every repository below shares the same single `prisma`
// instance, so the `require()` cast (see the comment below) needs to
// satisfy all of them at once, not just Identity's. `branch:
// SimpleMasterDataPrismaDelegate` is added directly (not via
// SimpleMasterDataPrismaClient, which only covers the six Master-Data-owned
// resources) since Branch is Identity & Access territory (branch.router.ts's
// own comment) but still reuses that generic Prisma delegate shape.
type AppPrismaClient = IdentityPrismaClient &
  EmployeePrismaClient &
  RolePermissionPrismaClient &
  AuditLogPrismaClient &
  SimpleMasterDataPrismaClient &
  CustomerPrismaClient &
  ProductPrismaClient &
  SubCategoryPrismaClient &
  SupplierPrismaClient &
  PurchaseRequestPrismaClient &
  PurchaseOrderPrismaClient &
  GrnPrismaClient &
  PurchaseInvoicePrismaClient &
  SupplierPaymentPrismaClient &
  PurchaseReturnPrismaClient &
  ApprovalRequestPrismaClient &
  SalesPrismaClient &
  ServicePrismaClient & { branch: SimpleMasterDataPrismaDelegate };

// `require()`, not `import`, deliberately: `@bts/db` re-exports the
// generated Prisma client, which does not exist in this sandbox (`prisma
// generate` needs network access to binaries.prisma.sh — see
// docs/HANDOFF.md). A static `import { PrismaClient } from "@bts/db"`
// would fail TypeScript's type resolution at compile time even though this
// file never runs in the test suite (app.test.ts calls createApp() with no
// deps). Swap this back to a normal typed import once Phase 1's migration
// has actually run somewhere with network access and `@prisma/client`'s
// types exist for real.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require("@bts/db") as { PrismaClient: new () => AppPrismaClient };
const prisma = new PrismaClient();

const tokenService = new JwtTokenService({
  accessTokenSecret: env.JWT_ACCESS_SECRET,
  refreshTokenSecret: env.JWT_REFRESH_SECRET,
  mfaTokenSecret: env.JWT_MFA_SECRET,
  mfaEnrollmentTokenSecret: env.JWT_MFA_ENROLLMENT_SECRET,
  accessTokenTtl: "15m",
  refreshTokenTtl: "30d",
  mfaTokenTtl: "5m",
  mfaEnrollmentTokenTtl: "5m",
});

const identity: AppDependencies["identity"] = {
  loginUseCase: new LoginUseCase(
    new PrismaUserRepository(prisma),
    new PrismaRefreshTokenRepository(prisma),
    new BcryptPasswordHasher(),
    tokenService,
    new TotpMfaService()
  ),
  refreshTokenUseCase: new RefreshTokenUseCase(new PrismaUserRepository(prisma), new PrismaRefreshTokenRepository(prisma), tokenService),
  logoutUseCase: new LogoutUseCase(new PrismaRefreshTokenRepository(prisma), tokenService),
};

const auditLog = new PrismaAuditLogWriter(prisma);
const employeeRepository = new PrismaEmployeeRepository(prisma);
const userRepository = new PrismaUserRepository(prisma);
const rolePermissionRepository = new PrismaRolePermissionRepository(prisma);

const employeeAndRoleManagement: AppDependencies["employeeAndRoleManagement"] = {
  tokenService,
  createEmployeeUseCase: new CreateEmployeeUseCase(employeeRepository),
  getEmployeeUseCase: new GetEmployeeUseCase(employeeRepository),
  getMyEmployeeUseCase: new GetMyEmployeeUseCase(employeeRepository),
  listEmployeesUseCase: new ListEmployeesUseCase(employeeRepository),
  updateEmployeeUseCase: new UpdateEmployeeUseCase(employeeRepository, auditLog),
  provisionUserUseCase: new ProvisionUserUseCase(userRepository, employeeRepository, new BcryptPasswordHasher(), new ConsoleCredentialNotifier(), auditLog),
  deactivateUserUseCase: new DeactivateUserUseCase(userRepository, auditLog),
  listRolesUseCase: new ListRolesUseCase(rolePermissionRepository),
  getRolePermissionsUseCase: new GetRolePermissionsUseCase(rolePermissionRepository),
  listPermissionsUseCase: new ListPermissionsUseCase(rolePermissionRepository),
  updateRolePermissionsUseCase: new UpdateRolePermissionsUseCase(rolePermissionRepository, auditLog),
};

const app = createApp({ identity, employeeAndRoleManagement, masterData: {
  tokenService,
  branchPrismaDelegate: prisma.branch,
  simpleMasterDataPrisma: prisma,
  customer: (() => {
    const customerRepository = new PrismaCustomerRepository(prisma);
    return {
      createCustomerUseCase: new CreateCustomerUseCase(customerRepository),
      getCustomerUseCase: new GetCustomerUseCase(customerRepository),
      listCustomersUseCase: new ListCustomersUseCase(customerRepository),
      updateCustomerUseCase: new UpdateCustomerUseCase(customerRepository),
      addCustomerAddressUseCase: new AddCustomerAddressUseCase(customerRepository),
      deleteCustomerUseCase: new DeleteCustomerUseCase(customerRepository),
    };
  })(),
  product: (() => {
    const productRepository = new PrismaProductRepository(prisma);
    return {
      createProductUseCase: new CreateProductUseCase(productRepository),
      getProductUseCase: new GetProductUseCase(productRepository),
      listProductsUseCase: new ListProductsUseCase(productRepository),
      updateProductUseCase: new UpdateProductUseCase(productRepository),
      deleteProductUseCase: new DeleteProductUseCase(productRepository),
    };
  })(),
  subCategory: (() => {
    const subCategoryRepository = new PrismaSubCategoryRepository(prisma);
    return {
      createSubCategoryUseCase: new CreateSubCategoryUseCase(subCategoryRepository),
      getSubCategoryUseCase: new GetSubCategoryUseCase(subCategoryRepository),
      listSubCategoriesUseCase: new ListSubCategoriesUseCase(subCategoryRepository),
      updateSubCategoryUseCase: new UpdateSubCategoryUseCase(subCategoryRepository),
      deleteSubCategoryUseCase: new DeleteSubCategoryUseCase(subCategoryRepository),
    };
  })(),
}, procurement: (() => {
  const approvalService = new ApprovalService(new PrismaApprovalRequestRepository(prisma));
  const supplierRepository = new PrismaSupplierRepository(prisma);
  const purchaseRequestRepository = new PrismaPurchaseRequestRepository(prisma);
  return {
    tokenService,
    approvalService,
    supplier: {
      createSupplierUseCase: new CreateSupplierUseCase(supplierRepository),
      getSupplierUseCase: new GetSupplierUseCase(supplierRepository),
      listSuppliersUseCase: new ListSuppliersUseCase(supplierRepository),
      updateSupplierUseCase: new UpdateSupplierUseCase(supplierRepository),
      addSupplierContactUseCase: new AddSupplierContactUseCase(supplierRepository),
      deleteSupplierUseCase: new DeleteSupplierUseCase(supplierRepository),
    },
    purchaseRequest: {
      createPurchaseRequestUseCase: new CreatePurchaseRequestUseCase(purchaseRequestRepository, approvalService),
      getPurchaseRequestUseCase: new GetPurchaseRequestUseCase(purchaseRequestRepository),
      listPurchaseRequestsUseCase: new ListPurchaseRequestsUseCase(purchaseRequestRepository),
      approvePurchaseRequestUseCase: new ApprovePurchaseRequestUseCase(purchaseRequestRepository, approvalService),
      rejectPurchaseRequestUseCase: new RejectPurchaseRequestUseCase(purchaseRequestRepository, approvalService),
    },
    purchaseOrder: (() => {
      const purchaseOrderRepository = new PrismaPurchaseOrderRepository(prisma);
      return {
        createPurchaseOrderUseCase: new CreatePurchaseOrderUseCase(purchaseOrderRepository, purchaseRequestRepository),
        getPurchaseOrderUseCase: new GetPurchaseOrderUseCase(purchaseOrderRepository),
        listPurchaseOrdersUseCase: new ListPurchaseOrdersUseCase(purchaseOrderRepository),
      };
    })(),
    grn: (() => {
      const grnRepository = new PrismaGrnRepository(prisma);
      const purchaseOrderRepository = new PrismaPurchaseOrderRepository(prisma);
      return {
        receiveGoodsUseCase: new ReceiveGoodsUseCase(grnRepository, purchaseOrderRepository, approvalService),
        getGrnUseCase: new GetGrnUseCase(grnRepository),
        listGrnsUseCase: new ListGrnsUseCase(grnRepository),
        approveGrnDiscrepancyUseCase: new ApproveGrnDiscrepancyUseCase(grnRepository, approvalService),
        updateGrnStatusUseCase: new UpdateGrnStatusUseCase(grnRepository),
        cancelGrnUseCase: new CancelGrnUseCase(grnRepository),
      };
    })(),
    purchaseInvoice: (() => {
      const purchaseInvoiceRepository = new PrismaPurchaseInvoiceRepository(prisma);
      const purchaseOrderRepository = new PrismaPurchaseOrderRepository(prisma);
      return {
        createPurchaseInvoiceUseCase: new CreatePurchaseInvoiceUseCase(purchaseInvoiceRepository, purchaseOrderRepository),
        getPurchaseInvoiceUseCase: new GetPurchaseInvoiceUseCase(purchaseInvoiceRepository),
      };
    })(),
    supplierPayment: (() => {
      const supplierPaymentRepository = new PrismaSupplierPaymentRepository(prisma);
      const purchaseInvoiceRepository = new PrismaPurchaseInvoiceRepository(prisma);
      return { recordSupplierPaymentUseCase: new RecordSupplierPaymentUseCase(supplierPaymentRepository, purchaseInvoiceRepository) };
    })(),
    purchaseReturn: (() => {
      const purchaseReturnRepository = new PrismaPurchaseReturnRepository(prisma);
      const grnRepository = new PrismaGrnRepository(prisma);
      return {
        createPurchaseReturnUseCase: new CreatePurchaseReturnUseCase(purchaseReturnRepository, grnRepository, approvalService),
        getPurchaseReturnUseCase: new GetPurchaseReturnUseCase(purchaseReturnRepository),
        approvePurchaseReturnUseCase: new ApprovePurchaseReturnUseCase(purchaseReturnRepository, approvalService),
        rejectPurchaseReturnUseCase: new RejectPurchaseReturnUseCase(purchaseReturnRepository, approvalService),
      };
    })(),
  };
})(),
  sales: (() => {
    const salesRepository = new PrismaSalesRepository(prisma);
    return {
      tokenService,
      createQuotationUseCase: new CreateQuotationUseCase(salesRepository),
      getQuotationUseCase: new GetQuotationUseCase(salesRepository),
      listQuotationsUseCase: new ListQuotationsUseCase(salesRepository),
      updateQuotationStatusUseCase: new UpdateQuotationStatusUseCase(salesRepository),
      createSalesOrderUseCase: new CreateSalesOrderUseCase(salesRepository),
      getSalesOrderUseCase: new GetSalesOrderUseCase(salesRepository),
      listSalesOrdersUseCase: new ListSalesOrdersUseCase(salesRepository),
      convertQuotationToSalesOrderUseCase: new ConvertQuotationToSalesOrderUseCase(salesRepository),
      createDeliveryChallanUseCase: new CreateDeliveryChallanUseCase(salesRepository),
      listDeliveryChallansUseCase: new ListDeliveryChallansUseCase(salesRepository),
      createInvoiceFromChallansUseCase: new CreateInvoiceFromChallansUseCase(salesRepository),
      getInvoiceUseCase: new GetInvoiceUseCase(salesRepository),
      listInvoicesUseCase: new ListInvoicesUseCase(salesRepository),
      getSalesStatsUseCase: new GetSalesStatsUseCase(salesRepository),
      createProjectUseCase: new CreateProjectUseCase(salesRepository),
      getProjectUseCase: new GetProjectUseCase(salesRepository),
      listProjectsUseCase: new ListProjectsUseCase(salesRepository),
      updateProjectStatusUseCase: new UpdateProjectStatusUseCase(salesRepository),
      addProjectItemUseCase: new AddProjectItemUseCase(salesRepository),
      removeProjectItemUseCase: new RemoveProjectItemUseCase(salesRepository),
      createDirectSaleUseCase: new CreateDirectSaleUseCase(salesRepository),
      createDeliveryChallanReturnUseCase: new CreateDeliveryChallanReturnUseCase(salesRepository),
      listDeliveryChallanReturnsUseCase: new ListDeliveryChallanReturnsUseCase(salesRepository),
      getSalesOrderFulfillmentUseCase: new GetSalesOrderFulfillmentUseCase(salesRepository),
      createCreditNoteUseCase: new CreateCreditNoteUseCase(salesRepository),
      listCreditNotesUseCase: new ListCreditNotesUseCase(salesRepository),
      createCustomerAdvanceUseCase: new CreateCustomerAdvanceUseCase(salesRepository),
      getCustomerAdvanceUseCase: new GetCustomerAdvanceUseCase(salesRepository),
      listCustomerAdvancesUseCase: new ListCustomerAdvancesUseCase(salesRepository),
      adjustCustomerAdvanceUseCase: new AdjustCustomerAdvanceUseCase(salesRepository),
      recordPaymentUseCase: new RecordPaymentUseCase(salesRepository),
      listPaymentsUseCase: new ListPaymentsUseCase(salesRepository),
      createBankTransactionProofUseCase: new CreateBankTransactionProofUseCase(salesRepository),
      getBankTransactionProofUseCase: new GetBankTransactionProofUseCase(salesRepository),
    };
  })(),
  inventory: (() => {
    const inventoryRepository = new PrismaInventoryRepository(prisma);
    return {
      tokenService,
      listStockUseCase: new ListStockUseCase(inventoryRepository),
      getInventoryStatsUseCase: new GetInventoryStatsUseCase(inventoryRepository),
      createStockAdjustmentUseCase: new CreateStockAdjustmentUseCase(inventoryRepository),
      listStockAdjustmentsUseCase: new ListStockAdjustmentsUseCase(inventoryRepository),
      createStockTransferUseCase: new CreateStockTransferUseCase(inventoryRepository),
      receiveStockTransferUseCase: new ReceiveStockTransferUseCase(inventoryRepository),
      listStockTransfersUseCase: new ListStockTransfersUseCase(inventoryRepository),
      createBatchUseCase: new CreateBatchUseCase(inventoryRepository),
      listBatchesUseCase: new ListBatchesUseCase(inventoryRepository),
      createSerialNumberUseCase: new CreateSerialNumberUseCase(inventoryRepository),
      getSerialHistoryUseCase: new GetSerialHistoryUseCase(inventoryRepository),
      listSerialNumbersUseCase: new ListSerialNumbersUseCase(inventoryRepository),
      scanBarcodeUseCase: new ScanBarcodeUseCase(inventoryRepository),
      createDamageLossReportUseCase: new CreateDamageLossReportUseCase(inventoryRepository),
      approveDamageLossReportUseCase: new ApproveDamageLossReportUseCase(inventoryRepository),
      listDamageLossReportsUseCase: new ListDamageLossReportsUseCase(inventoryRepository),
    };
  })(),
  service: (() => {
    const serviceRepository = new PrismaServiceRepository(prisma);
    return {
      tokenService,
      createTicketUseCase: new CreateTicketUseCase(serviceRepository),
      getTicketUseCase: new GetTicketUseCase(serviceRepository),
      listTicketsUseCase: new ListTicketsUseCase(serviceRepository),
      createServiceQuotationUseCase: new CreateServiceQuotationUseCase(serviceRepository),
      createServiceAssignmentUseCase: new CreateServiceAssignmentUseCase(serviceRepository),
      getServiceAssignmentUseCase: new GetServiceAssignmentUseCase(serviceRepository),
      listServiceAssignmentsUseCase: new ListServiceAssignmentsUseCase(serviceRepository),
      assignTechnicianUseCase: new AssignTechnicianUseCase(serviceRepository),
      updateAssignmentStatusUseCase: new UpdateAssignmentStatusUseCase(serviceRepository),
      issueProductCustodyUseCase: new IssueProductCustodyUseCase(serviceRepository),
      updateProductCustodyStatusUseCase: new UpdateProductCustodyStatusUseCase(serviceRepository),
      listProductCustodyUseCase: new ListProductCustodyUseCase(serviceRepository),
      issueTechnicianAdvanceUseCase: new IssueTechnicianAdvanceUseCase(serviceRepository),
      listTechnicianAdvancesUseCase: new ListTechnicianAdvancesUseCase(serviceRepository),
      submitConveyanceBillUseCase: new SubmitConveyanceBillUseCase(serviceRepository),
      approveConveyanceBillUseCase: new ApproveConveyanceBillUseCase(serviceRepository),
      rejectConveyanceBillUseCase: new RejectConveyanceBillUseCase(serviceRepository),
      listConveyanceBillsUseCase: new ListConveyanceBillsUseCase(serviceRepository),
      recordGpsCheckinUseCase: new RecordGpsCheckinUseCase(serviceRepository),
      listLiveLocationLogsUseCase: new ListLiveLocationLogsUseCase(serviceRepository),
      closeServiceAssignmentUseCase: new CloseServiceAssignmentUseCase(serviceRepository),
      getServicePnlUseCase: new GetServicePnlUseCase(serviceRepository),
      createWarrantyUseCase: new CreateWarrantyUseCase(serviceRepository),
      getWarrantyUseCase: new GetWarrantyUseCase(serviceRepository),
      listWarrantiesUseCase: new ListWarrantiesUseCase(serviceRepository),
      createWarrantyClaimUseCase: new CreateWarrantyClaimUseCase(serviceRepository),
      listWarrantyClaimsUseCase: new ListWarrantyClaimsUseCase(serviceRepository),
      getServiceStatsUseCase: new GetServiceStatsUseCase(serviceRepository),
    };
  })(),
});

const server = app.listen(env.API_PORT, () => {
  logger.info(`[api] listening on :${env.API_PORT} (env=${env.NODE_ENV})`);
});

// Graceful shutdown — matters once Phase 10+ adds long-running DB
// transactions and Phase 15's BullMQ worker; harmless but correct to have
// from Phase 0.
function shutdown(signal: string): void {
  logger.info(`[api] received ${signal}, shutting down`);
  server.close(() => process.exit(0));
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled Rejection caught at process level");
});
process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught Exception caught at process level");
});

