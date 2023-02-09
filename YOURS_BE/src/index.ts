import express, { NextFunction, Request, Response } from 'express';
import router from './routes/index';
import cors from 'cors';
import config from './config';
import generalErrorHandler from './middlewares/error/errorHandler';
import { connectRedis } from './loader/redis';

const app = express();

connectRedis();

const allowedOrigins = [
  'http://localhost:3000',
  config.ec2URL,
  'http://yoursnft.me',
  'https://api.yoursnft.me',
  'https://www.yoursnft.me',
  'https://yoursnft.me',
];
const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
  const origin: string = req.headers.origin!;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.header(
    'Access-Control-Allow-Headers',
    'X-Requested-With, content-type, x-access-token',
  );
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/api', router);
app.use(generalErrorHandler);
app.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.send('Yours SERVER');
});

app.listen(config.port, () => {
  console.log(`
        #############################################
            🛡️ Server listening on port: ${config.port} 🛡️
        #############################################
    `);
});
