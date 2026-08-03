import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env, isDev } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { ApiError } from './utils/apiError.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header (curl, server-to-server, same-origin) — allow.
        if (!origin || env.CLIENT_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(ApiError.forbidden(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true, // allow the refresh cookie
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (isDev) app.use(morgan('dev'));

  app.use('/api', routes);

  app.use(notFoundHandler); // 404 envelope
  app.use(errorHandler); // final error → envelope

  return app;
}
