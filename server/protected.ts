// server/protected.ts
import express from 'express';
import {authenticateToken} from './authMiddleware';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const router = express.Router();

router.get('/dashboard', authenticateToken, async (req, res): Promise<any> => {
 const userId = (req as any).user.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, surname: true },
  });

  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    message: "Welcome back!",
    firstName: user.firstName,
    surname: user.surname,
  });
});

export default router;
