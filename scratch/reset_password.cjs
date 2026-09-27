const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@bts.com' } });
  console.log('User passwordHash:', user.passwordHash);
  // Reset password to 'Admin12345!' with bcrypt
  const hash = await bcrypt.hash('Admin12345!', 10);
  await prisma.user.update({
    where: { email: 'admin@bts.com' },
    data: { passwordHash: hash }
  });
  console.log('Updated admin@bts.com password to Admin12345!');
  await prisma.$disconnect();
}
main();
