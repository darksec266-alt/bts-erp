// prd.md §8.2 / api-spec.md §13. Customer is richer than the generic
// simple-master-data shape (modules/master-data) — it has addresses,
// a service-only flag, and branch scoping — so it gets its own bespoke
// module rather than being forced into that generic factory.

export interface CustomerAddressInput {
  label: string;
  addressLine: string;
}

export interface CustomerRecord {
  id: string;
  customerCode: string;
  displayName: string;
  phone: string;
  branchId: string;
  walletBalance?: number;
  branch?: {
    id: string;
    code: string;
    name: string;
  };
  isServiceOnly: boolean;
  isActive: boolean;
  addresses: { id: string; label: string; addressLine: string }[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CustomerFinancialSummary {
  totalInvoiced: number;
  totalPaid: number;
  totalReturned: number;
  currentDue: number;
  walletBalance: number;
}

export interface CustomerWalletTransactionRecord {
  id: string;
  customerId: string;
  amount: number;
  type: string;
  referenceType?: string | null;
  referenceId?: string | null;
  balanceAfter: number;
  notes?: string | null;
  createdById?: string | null;
  createdAt: Date | string;
}

export interface CustomerProfileRecord {
  customer: CustomerRecord;
  summary: CustomerFinancialSummary;
  invoices: any[];
  salesReturns: any[];
  payments: any[];
  walletTransactions: CustomerWalletTransactionRecord[];
}

export interface CreateCustomerInput {
  customerCode: string;
  displayName: string;
  phone: string;
  branchId: string;
  isServiceOnly?: boolean;
  addresses?: CustomerAddressInput[];
}

export interface UpdateCustomerInput {
  displayName?: string;
  phone?: string;
  branchId?: string;
  isServiceOnly?: boolean;
  isActive?: boolean;
}

export interface CustomerListFilter {
  branchId?: string;
  isActive?: boolean;
  isServiceOnly?: boolean;
  search?: string;
}

export interface CustomerRepository {
  create(input: CreateCustomerInput): Promise<CustomerRecord>;
  findById(id: string): Promise<CustomerRecord | null>;
  findByPhone(phone: string): Promise<CustomerRecord | null>;
  list(filter: CustomerListFilter, page: { skip: number; take: number }): Promise<{ items: CustomerRecord[]; total: number }>;
  update(id: string, input: UpdateCustomerInput): Promise<CustomerRecord>;
  addAddress(customerId: string, input: CustomerAddressInput): Promise<CustomerRecord>;
  delete(id: string): Promise<void>; // throws EntityInUseError (modules/master-data's shared error) if referenced elsewhere
  getProfile(id: string): Promise<CustomerProfileRecord | null>;
  topupWallet(customerId: string, amount: number, notes?: string, userId?: string): Promise<CustomerWalletTransactionRecord>;
  payInvoiceFromWallet(customerId: string, invoiceId: string, amount: number, notes?: string, userId?: string): Promise<{ payment: any; transaction: CustomerWalletTransactionRecord }>;
}

