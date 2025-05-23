// server/protected.ts
import express from 'express';
import {authenticateToken} from './authMiddleware';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const router = express.Router();

router.get('/dashboard', authenticateToken, async (req, res): Promise<any> => {
  const userPayload = (req as any).user;

  // ✅ Check DB to ensure user still exists
  const user = await prisma.user.findUnique({ where: { email: userPayload.email } });

  if (!user) {
    return res.status(401).json({ error: 'User no longer exists' });
  }

  res.json({ message: `Welcome to your dashboard, ${user.firstName}` });
});

export default router;
