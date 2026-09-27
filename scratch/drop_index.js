const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.$executeRawUnsafe('DROP INDEX IF EXISTS "SerialNumber_barcode_key";')
  .then((r) => console.log("Dropped index:", r))
  .catch((e) => console.error("Error:", e))
  .finally(() => p.$disconnect());
