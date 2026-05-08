import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import auth from './auth';
import protectedRoutes from './protected';
import webhook from './webhook';
import path from 'path';
import fs from 'fs';


dotenv.config();

const app = express();
const PORT = 4242;

app.use(cors());

// ✅ Route-mounted raw body handler
app.use('/webhook', webhook);

// Serve static files for profile photos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve built frontend from the API server so localhost:4242 always renders UI.
const frontendDistPath = path.join(__dirname, '../dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');

if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath));

  // SPA fallback for client-side routes. Do not intercept API/static routes.
  app.get(/^\/(?!auth|api|webhook|uploads).*/, (_req, res) => {
    res.sendFile(frontendIndexPath);
  });
} else {
  app.get('/', (_req, res) => {
    res.json({
      ok: true,
      message:
        'API server is running. Frontend build not found in /dist. Start Vite at http://localhost:5173',
    });
  });
}



// ✅ All other routes use JSON parsing
app.use(bodyParser.json());
app.use('/auth', auth);
app.use('/api', protectedRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
