// import dns from 'node:dns';
// dns.setServers(['8.8.8.8', '1.1.1.1']);
// import 'dotenv/config';
// import http from 'node:http';
// import express from 'express';
// import helmet from 'helmet';
// import cookieParser from 'cookie-parser';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import jwt from 'jsonwebtoken';
// import { Server } from 'socket.io';
// import { parse } from 'cookie';
// import { connectDB } from './config/db.js';
// import routes from './routes/index.js';
// import { registerSocketChatHandlers } from './controllers/chatController.js';
// import { recordVisit } from './utils/trafficTracker.js';

// const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const app = express();
// const httpServer = http.createServer(app);
// const io = new Server(httpServer, {
//   cors: {
//     origin: true,
//     credentials: true,
//   },
// });

// app.set('io', io);
// app.use(helmet({
//   crossOriginResourcePolicy: { policy: 'cross-origin' },
// }));
// app.use(express.json({ limit: '32kb' }));
// app.use(cookieParser());
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// app.use((req, res, next) => {
//   const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip;
//   recordVisit(clientIp);
//   next();
// });

// app.use('/api', routes);


// if (process.env.NODE_ENV === 'production') {
//   const dist = path.join(__dirname, '../../client/dist');
//   app.use(express.static(dist));
//   app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
// }

// app.use((err, req, res, next) => {
//   if (res.headersSent) return next(err);
//   if (err?.type === 'entity.too.large') {
//     return res.status(413).json({ message: 'Request payload is too large.' });
//   }
//   if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
//     return res.status(400).json({ message: 'Request body is not valid JSON.' });
//   }
//   if (err?.name === 'ValidationError') {
//     return res.status(400).json({ message: Object.values(err.errors)[0]?.message || 'Please provide valid data.' });
//   }
//   if (err?.name === 'CastError') {
//     return res.status(400).json({ message: 'The requested reference is invalid.' });
//   }
//   if (err?.code === 11000) {
//     return res.status(409).json({ message: 'This record already exists.' });
//   }
//   console.error(err);
//   res.status(500).json({ message: 'Something went wrong on the server.' });
// });

// const defaultPort = Number(process.env.PORT) || 5001;

// function startServer(port) {
//   const server = httpServer.listen(port, '127.0.0.1', () => {
//     console.log(`Server running on http://localhost:${port}`);
//   });

//   server.on('error', (error) => {
//     if ((error.code === 'EACCES' || error.code === 'EADDRINUSE') && port < 5010) {
//       console.warn(`Port ${port} unavailable, retrying on ${port + 1}.`);
//       startServer(port + 1);
//       return;
//     }

//     console.error('Failed to start server:', error.message);
//     process.exit(1);
//   });
// }

// io.use((socket, next) => {
//   const cookies = parse(socket.handshake.headers.cookie || '');
//   const token = cookies.token;
//   if (!token) return next(new Error('Unauthorized'));

//   try {
//     const payload = jwt.verify(token, process.env.JWT_SECRET);
//     if (!payload || typeof payload !== 'object' || typeof payload.id !== 'string') {
//       return next(new Error('Unauthorized'));
//     }
//     socket.userId = payload.id;
//     return next();
//   } catch (error) {
//     return next(new Error('Unauthorized'));
//   }
// });

// registerSocketChatHandlers(io);

// connectDB()
//   .then(() => startServer(defaultPort))
//   .catch((e) => {
//     console.error('Failed to start server:', e.message);
//     process.exit(1);
//   });


















import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { parse } from 'cookie';
import { connectDB } from './config/db.js';
import routes from './routes/index.js';
import { registerSocketChatHandlers } from './controllers/chatController.js';
import { recordVisit } from './utils/trafficTracker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isVercel = !!process.env.VERCEL;
const app = express();

// ---------- Socket.io (Vercel-এ চলে না, তাই শুধু অন্য জায়গায় চালু) ----------
let httpServer = null;
let io;

if (!isVercel) {
  httpServer = http.createServer(app);
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });
} else {
  // Vercel-এ controller-এ io.emit(...) ব্যবহার থাকলেও যেন crash না করে
  const noopEmitter = { emit() { }, to() { return noopEmitter; }, in() { return noopEmitter; } };
  io = noopEmitter;
}

app.set('io', io);

// ---------- Middlewares ----------
app.set('trust proxy', 1);

app.use(
  cors({
    origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : true,
    credentials: true,
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ---------- DB connection (প্রতি request-এর আগে নিশ্চিত করা) ----------
let dbPromise;
const ensureDB = () => (dbPromise ??= connectDB());

app.use(async (req, res, next) => {
  try {
    await ensureDB();
    next();
  } catch (e) {
    dbPromise = null;
    next(e);
  }
});

app.use((req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip;
  recordVisit(clientIp);
  next();
});

// ---------- Routes ----------
app.get('/', (req, res) => res.json({ ok: true, message: 'LocoMov API is running' }));

app.use('/api', routes);

if (process.env.NODE_ENV === 'production' && !isVercel) {
  const dist = path.join(__dirname, '../../client/dist');
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// ---------- Error handler ----------
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request payload is too large.' });
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Request body is not valid JSON.' });
  }
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors)[0]?.message || 'Please provide valid data.' });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ message: 'The requested reference is invalid.' });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ message: 'This record already exists.' });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

// ---------- Local / Render: server চালু করা ----------
const defaultPort = Number(process.env.PORT) || 5001;
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

function startServer(port) {
  const server = httpServer.listen(port, host, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if ((error.code === 'EACCES' || error.code === 'EADDRINUSE') && port < 5010) {
      console.warn(`Port ${port} unavailable, retrying on ${port + 1}.`);
      startServer(port + 1);
      return;
    }

    console.error('Failed to start server:', error.message);
    process.exit(1);
  });
}

if (!isVercel) {
  io.use((socket, next) => {
    const cookies = parse(socket.handshake.headers.cookie || '');
    const token = cookies.token;
    if (!token) return next(new Error('Unauthorized'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (!payload || typeof payload !== 'object' || typeof payload.id !== 'string') {
        return next(new Error('Unauthorized'));
      }
      socket.userId = payload.id;
      return next();
    } catch (error) {
      return next(new Error('Unauthorized'));
    }
  });

  registerSocketChatHandlers(io);

  ensureDB()
    .then(() => startServer(defaultPort))
    .catch((e) => {
      console.error('Failed to start server:', e.message);
      process.exit(1);
    });
}


export default app;