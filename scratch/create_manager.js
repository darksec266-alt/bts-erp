const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hoBranch = await prisma.branch.findUniqueOrThrow({
    where: { code: "HO-01" },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "ADMIN" },
  });

  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const managerUser = await prisma.user.upsert({
    where: { email: "manager@bts.com" },
    update: {
      passwordHash,
      mfaEnabled: false,
      branchId: hoBranch.id,
      roleId: adminRole.id,
    },
    create: {
      email: "manager@bts.com",
      passwordHash,
      mfaEnabled: false,
      branchId: hoBranch.id,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  console.log("Admin user created successfully:", managerUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
