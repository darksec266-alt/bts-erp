const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial branch and super admin user...');

  // 1. Upsert default branch
  const branch = await prisma.branch.upsert({
    where: { code: 'BR-MAIN-01' },
    update: {},
    create: {
      code: 'BR-MAIN-01',
      name: 'Dhaka Main Branch',
      isActive: true,
    },
  });
  console.log('Branch created/found:', branch.code, branch.id);

  // 2. Find SUPER_ADMIN role
  const role = await prisma.role.findUnique({
    where: { name: 'SUPER_ADMIN' },
  });

  if (!role) {
    throw new Error('SUPER_ADMIN role not found. Run npm run seed in packages/db first.');
  }

  // 3. Upsert Super Admin user
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@bts.com' },
    update: {
      passwordHash,
      roleId: role.id,
      branchId: branch.id,
      isActive: true,
    },
    create: {
      email: 'admin@bts.com',
      passwordHash,
      roleId: role.id,
      branchId: branch.id,
      isActive: true,
    },
  });

  console.log('Super Admin user created/updated successfully:');
  console.log({ id: user.id, email: user.email, role: role.name, branch: branch.name });
}

main()
  .catch((err) => {
    console.error('Seed admin failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
