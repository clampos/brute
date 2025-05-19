import express, { Request, Response } from 'express';
import { getUser } from './users';
import { createToken } from './utils';

const router = express.Router();

router.post('/login', (req: Request, res: Response): void => {
  const { email } = req.body;

  const user = getUser(email);
  if (!user || !user.subscribed) {
    res.status(401).json({ error: 'Not authorized' });
    return;
  }

  const token = createToken({ email });
  res.json({ token });
});

export default router;
