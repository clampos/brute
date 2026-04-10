console.log('cwd:', process.cwd());
process.env.DATABASE_URL = 'file:./prisma/dev.db';
console.log('DATABASE_URL:', process.env.DATABASE_URL);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  const user = await prisma.user.findUnique({ where: { email: 'charlie@onyxdigital.io' } });
  console.log('User found:', user ? { email: user.email, hasPassword: !!user.password, subscribed: user.subscribed, password: user.password } : 'null');
  if (user && user.password) {
    const bcrypt = require('bcrypt');
    const match = await bcrypt.compare('Password88!!', user.password);
    console.log('Password matches:', match);
  }
  await prisma.$disconnect();
})();