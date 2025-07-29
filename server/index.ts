import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import auth from './auth';
import protectedRoutes from './protected';
import webhook from './webhook';
import path from 'path';


dotenv.config();

const app = express();
const PORT = 4242;

app.use(cors());

// ✅ Route-mounted raw body handler
app.use('/webhook', webhook);

// Serve static files for profile photos
// Serve static files for profile photos
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));



// ✅ All other routes use JSON parsing
app.use(bodyParser.json());
app.use('/auth', auth);
app.use('/api', protectedRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
