const { execSync } = require('child_process');

const tables = [
  'TaxRate', 'Employee', 'SalesOrder', 'SalesOrderLine', 'ChartOfAccounts',
  'Warranty', 'DeliveryChallanReturn', 'DeliveryChallanReturnLine',
  'TechnicianAssignment', 'ProductCustody', 'ConveyanceBill', 'TechnicianAdvance',
  'DamageLossReport', 'DamageLossLine', 'PurchaseReturn', 'CompanyLoan',
  'Investment', 'EmployeeAdvance', 'LoanRepaymentSchedule', 'CustomerAdvance',
  'AdvanceAdjustment', 'Ticket', 'WarrantyClaim'
];

for (const t of tables) {
  try {
    const cols = execSync(`docker exec bts_erp-postgres-1 psql -U bts_user -d bts_erp -t -A -F "," -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${t}' ORDER BY ordinal_position;"`).toString().trim().split('\n');
    console.log(`=== ${t} ===\n` + cols.map(c => '  ' + c).join('\n'));
  } catch(e) {
    console.log(`=== ${t} === (not found)`);
  }
}
