const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const prisma = new PrismaClient();

const BASE_URL = "http://localhost:4000/api/v1";

async function apiCall(method, path, body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json.data || json, error: json.error || null };
}

async function main() {
  const adminUser = await prisma.user.findFirst();
  const branch = await prisma.branch.findFirst({ where: { isActive: true } });
  const supplier = await prisma.supplier.findFirst({ where: { isActive: true } });
  const product = await prisma.product.findFirst({ where: { isActive: true } });

  const token = jwt.sign(
    { sub: adminUser.id, email: adminUser.email, role: "SUPER_ADMIN", tokenFamily: "cancel-test" },
    process.env.JWT_ACCESS_SECRET || "dev-jwt-access-secret-minimum-32-chars-long!",
    { expiresIn: "1h" }
  );

  const rand = Math.floor(Math.random() * 100000);
  const poNumber = `PO-CANCEL-TEST-${rand}`;

  // 1. Create a PO
  const poRes = await apiCall("POST", "/purchase-orders", {
    poNumber,
    supplierId: supplier.id,
    branchId: branch.id,
    lines: [{ productId: product.id, quantity: "10", unitPrice: "500" }],
  }, token);

  console.log("✔ Created PO:", poRes.data.poNumber, "Status:", poRes.data.fulfillmentStatus);

  // 2. Cancel the PO
  const cancelRes = await apiCall("POST", `/purchase-orders/${poRes.data.id}/cancel`, {
    reason: "Vendor out of stock",
  }, token);

  console.log("✔ Cancel PO Response:", cancelRes.status, "Status:", cancelRes.data.fulfillmentStatus || cancelRes.data.status);
  if (cancelRes.data.status !== "CANCELLED" && cancelRes.data.fulfillmentStatus !== "CANCELLED") {
    throw new Error("PO status should be CANCELLED!");
  }

  // 3. Attempt to receive goods against cancelled PO
  const grnRes = await apiCall("POST", `/purchase-orders/${poRes.data.id}/receive`, {
    grnNumber: `GRN-ILLEGAL-${rand}`,
    status: "COMPLETE",
    lines: [{ purchaseOrderLineId: poRes.data.lines[0].id, productId: product.id, quantityReceived: "10" }],
  }, token);

  console.log("✔ Attempt to receive against cancelled PO status:", grnRes.status, "Message:", grnRes.error?.message || grnRes.data?.message);
  if (grnRes.status === 201) {
    throw new Error("Receiving against cancelled PO should have been rejected!");
  }

  console.log("✔ PO Cancellation and Receiving Lock verified 100% successfully!");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ PO CANCEL TEST FAILED:", e);
  await prisma.$disconnect();
  process.exit(1);
});
