import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import bodyParser from 'body-parser';
import webhook from './webhook';
import auth from './auth';

dotenv.config();

const app = express();
const PORT = 4242;

app.use(cors());
app.use('/webhook', webhook); // webhook uses raw body

app.use(bodyParser.json());
app.use('/auth', auth); // login routes

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
