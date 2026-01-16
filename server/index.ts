import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import auth from './auth';
import protectedRoutes from './protected';
import webhook from './webhook';
import path from 'path';


dotenv.config();

// Validate critical environment variables
const requiredEnvVars = ['JWT_SECRET', 'STRIPE_SECRET_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('📝 Please create a server/.env file based on server/.env.example');
  console.error('📖 See docs/STRIPE_SETUP.md for setup instructions');
  process.exit(1);
}

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
  console.log('');
  console.log('📌 Environment:');
  console.log(`   - JWT_SECRET: ${process.env.JWT_SECRET ? '✓ Set' : '✗ Missing'}`);
  console.log(`   - STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`   - STRIPE_WEBHOOK_SECRET: ${process.env.STRIPE_WEBHOOK_SECRET ? '✓ Set' : '⚠ Missing (needed for webhooks)'}`);
  console.log('');
  console.log('💡 Tip: If you see "api_key_expired" error:');
  console.log('   1. Generate a new key at https://dashboard.stripe.com/test/apikeys');
  console.log('   2. Update STRIPE_SECRET_KEY in server/.env');
  console.log('   3. Restart this server');
  console.log('   📖 Full guide: docs/STRIPE_SETUP.md');
  console.log('');
});
