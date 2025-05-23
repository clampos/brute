import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET!;
const prisma = new PrismaClient();

export const authenticateToken: RequestHandler = async (req, res, next): Promise<any> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, email: string };

    // Optional: attach to req
    (req as any).user = decoded;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { subscribed: true },
    });

    if (!user || !user.subscribed) {
      return res.status(403).json({ error: 'Subscription required' });
    }

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};
