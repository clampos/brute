// server/users.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function addUser(email: string, plainPassword: string) {
  const hashed = await bcrypt.hash(plainPassword, 10);
  return prisma.user.create({
    data: {
      email,
      password: hashed,
    },
  });
}

export async function getUser(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function markUserSubscribed(email: string) {
  return prisma.user.update({
    where: { email },
    data: { subscribed: true },
  });
}
