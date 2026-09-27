const jwt = require("jsonwebtoken");

async function run() {
  const token = jwt.sign(
    { sub: "usr_admin", role: "SUPER_ADMIN", permissions: ["*"] },
    "dev-only-access-secret-change-me-before-any-real-deployment",
    { expiresIn: "1h" }
  );

  const custRes = await fetch("http://localhost:4000/api/v1/customers", {
    headers: { Authorization: "Bearer " + token },
  });
  const custData = await custRes.json();
  console.log("Customers API HTTP Status:", custRes.status, "Response:", custData);
  if (!custData.data) return;
  
  const rahims = custData.data.items.filter(c => c.displayName.includes("Rahim"));
  for (const rahim of rahims) {
    console.log(`\n--- ${rahim.displayName} (${rahim.customerCode}) ---`);
    const rProfRes = await fetch(`http://localhost:4000/api/v1/customers/${rahim.id}/profile`, {
      headers: { Authorization: "Bearer " + token },
    });
    const rProf = await rProfRes.json();
    console.log("Summary:", rProf.data.summary);
    console.log("Invoices count:", rProf.data.invoices.length);
    console.log("Sales Returns count:", rProf.data.salesReturns.length);
    console.log("Wallet Transactions count:", rProf.data.walletTransactions.length);
    if (rProf.data.walletTransactions.length > 0) {
      console.log("Recent Wallet Tx:", rProf.data.walletTransactions.map(t => `${t.type}: ৳${t.amount} (Balance: ৳${t.balanceAfter})`));
    }
  }

  const returnsRes = await fetch("http://localhost:4000/api/v1/sales/returns", {
    headers: { Authorization: "Bearer " + token },
  });
  const returnsData = await returnsRes.json();
  console.log("Sales Returns API HTTP Status:", returnsRes.status, "Returns Response:", returnsData);
  if (returnsData.data?.items?.length > 0) {
    const latest = returnsData.data.items[0];
    console.log(`Latest Return: #${latest.returnNumber}, Invoice: #${latest.invoiceNumber}, Refund: ৳${latest.refundAmount}, CreditedToWallet: ${latest.creditToWallet}`);
  }

  console.log("\n--- Checking Invoices API ---");
  const invRes = await fetch("http://localhost:4000/api/v1/sales/invoices", {
    headers: { Authorization: "Bearer " + token },
  });
  const invData = await invRes.json();
  console.log("Invoices API HTTP Status:", invRes.status, "Invoices Response:", invData);
  if (invData.data?.items?.length > 0) {
    console.log("First invoice:", invData.data.items[0].invoiceNumber, "GrandTotal:", invData.data.items[0].grandTotal, "Status:", invData.data.items[0].status);
  } else {
    console.log("No invoices returned! Data:", JSON.stringify(invData));
  }
}

run().catch(console.error);
