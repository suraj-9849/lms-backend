import express from 'express';
import dotenv from 'dotenv';
import cors from "cors";
import uploadRouter from './routes/upload-video.js';

dotenv.config();

const app = express();
const PORT = 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'https://lmss-proo.vercel.app'
    ],
    credentials: true,
  })
);


app.use('/api/upload-video', uploadRouter);

app.get('/', (req, res) => {
  res.send('Video Upload API is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
