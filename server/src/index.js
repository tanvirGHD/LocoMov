import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import routes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(helmet());
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

app.use('/api', routes);

// প্রোডাকশনে React বিল্ড এই সার্ভার থেকেই দেওয়া হবে
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../../client/dist');
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'অনুরোধের তথ্য অনেক বড়' });
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'অনুরোধের তথ্য সঠিক JSON নয়' });
  }
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors)[0]?.message || 'তথ্য সঠিকভাবে পূরণ করুন' });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ message: 'অনুরোধের পরিচিতি সঠিক নয়' });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ message: 'এই তথ্য দিয়ে অ্যাকাউন্ট বা প্রস্তাব আগে থেকেই আছে' });
  }
  console.error(err);
  res.status(500).json({ message: 'সার্ভারে সমস্যা হয়েছে' });
});

const port = process.env.PORT || 5000;
connectDB()
  .then(() => app.listen(port, () => console.log(`Server running on http://localhost:${port}`)))
  .catch((e) => {
    console.error('শুরু করা যায়নি:', e.message);
    process.exit(1);
  });
