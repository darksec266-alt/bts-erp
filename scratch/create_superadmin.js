const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // 1. Create Default Branches
  const hoBranch = await prisma.branch.upsert({
    where: { code: "HO-01" },
    update: {},
    create: {
      code: "HO-01",
      name: "Head Office (Dhaka)",
      isActive: true,
    },
  });
  console.log("Branch created:", hoBranch.name, hoBranch.id);

  const ctgBranch = await prisma.branch.upsert({
    where: { code: "CTG-01" },
    update: {},
    create: {
      code: "CTG-01",
      name: "Chittagong Branch",
      isActive: true,
    },
  });
  console.log("Branch created:", ctgBranch.name, ctgBranch.id);

  // 2. Find SUPER_ADMIN role
  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "SUPER_ADMIN" },
  });

  // 3. Create Super Admin User
  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@bts.com" },
    update: {
      passwordHash,
      mfaEnabled: false,
      branchId: hoBranch.id,
      roleId: superAdminRole.id,
    },
    create: {
      email: "admin@bts.com",
      passwordHash,
      mfaEnabled: false,
      branchId: hoBranch.id,
      roleId: superAdminRole.id,
      isActive: true,
    },
  });

  console.log("Super Admin user created successfully:", adminUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
