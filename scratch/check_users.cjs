const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: { select: { name: true } } } });
  console.log('Existing users in DB:', JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}
main();
