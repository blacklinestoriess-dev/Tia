import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { handleChatRequest } from './server/chatHandler.ts';
import { handleProfileRequest } from './server/profileHandler.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// API endpoint for Tia chat
app.post('/api/chat', (req, res) => {
  handleChatRequest(req, res);
});

// API endpoint for persistent owner profile and memories
app.use('/api/profile', (req, res) => {
  handleProfileRequest(req, res);
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', assistant: 'Tia' });
});

// Serve production static assets from dist
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback to index.html
app.get('*', (_req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tia AI Voice Assistant server running at http://0.0.0.0:${PORT}`);
});
