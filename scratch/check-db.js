const { execSync } = require('child_process');

function runPsql(sql) {
  try {
    return execSync('docker exec -i bts_erp-postgres-1 psql -U bts_user -d bts_erp', {
      input: sql,
      encoding: 'utf-8',
    });
  } catch (e) {
    return e.stdout || e.message;
  }
}

console.log("--- DeliveryChallan & DeliveryChallanLine counts ---");
console.log(runPsql('SELECT COUNT(*) FROM "DeliveryChallan"; SELECT COUNT(*) FROM "DeliveryChallanLine";'));

console.log("--- DeliveryChallan columns ---");
console.log(runPsql("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'DeliveryChallan' ORDER BY ordinal_position;"));

console.log("--- DeliveryChallanLine columns ---");
console.log(runPsql("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'DeliveryChallanLine' ORDER BY ordinal_position;"));

console.log("--- SalesReturn columns ---");
console.log(runPsql("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'SalesReturn' ORDER BY ordinal_position;"));

console.log("--- SalesReturnLine columns ---");
console.log(runPsql("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'SalesReturnLine' ORDER BY ordinal_position;"));

console.log("--- Sample DeliveryChallan ---");
console.log(runPsql('SELECT * FROM "DeliveryChallan" LIMIT 2;'));

console.log("--- GoodsReceiptNote columns ---");
console.log(runPsql("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'GoodsReceiptNote' ORDER BY ordinal_position;"));
console.log("--- PurchaseOrder columns ---");
console.log(runPsql("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'PurchaseOrder' ORDER BY ordinal_position;"));
console.log("--- PurchaseRequest columns ---");
console.log(runPsql("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'PurchaseRequest' ORDER BY ordinal_position;"));












