import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import webhook from './webhook';
import auth from './auth';
import protectedRoutes from './protected';


dotenv.config();

const app = express();
const PORT = 4242;

app.use(cors());

// ✅ Route-mounted raw body handler
app.use('/webhook', webhook);

// ✅ All other routes use JSON parsing
app.use(bodyParser.json());
app.use('/auth', auth);
app.use('/api', protectedRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
