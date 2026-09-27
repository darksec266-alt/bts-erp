const { execSync } = require('child_process');

const tables = [
  'Employee', 'Unit', 'TaxRate', 'SalesOrderLine', 'DeliveryChallanReturn',
  'DeliveryChallanReturnLine', 'TechnicianAssignment', 'ProductCustody',
  'TechnicianAdvance', 'ConveyanceBill', 'ProjectClosureReport', 'Warranty',
  'ChartOfAccounts', 'JournalEntry', 'CustomerAdvance', 'AdvanceAdjustment',
  'SerialNumber', 'DamageLossReport', 'DamageLossLine', 'SupplierPayment',
  'PurchaseReturn', 'CompanyLoan', 'LoanRepaymentSchedule', 'Investment',
  'EmployeeAdvance', 'DraftState'
];

for (const t of tables) {
  try {
    const count = execSync(`docker exec bts_erp-postgres-1 psql -U bts_user -d bts_erp -t -A -c "SELECT count(*) FROM \\"${t}\\";"`).toString().trim();
    console.log(`${t.padEnd(28)}: ${count} rows`);
  } catch(e) {
    console.log(`${t.padEnd(28)}: error / not exists`);
  }
}
