import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { authMiddleware } from './auth.js';
import authRoutes from './routes/auth.js';
import leadsRoutes from './routes/leads.js';
import campaignsRoutes from './routes/campaigns.js';
import automationsRoutes from './routes/automations.js';
import notificationsRoutes from './routes/notifications.js';
import settingsRoutes from './routes/settings.js';
import integrationsRoutes from './routes/integrations.js';
import knowledgeRoutes from './routes/knowledge.js';
import aiRoutes from './routes/ai.js';
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';
import adsRoutes from './routes/ads.js';
import whatsappRoutes from './routes/whatsapp.js';
import calendarRoutes from './routes/calendar.js';
import collectionsRoutes from './routes/collections.js';
import { startCollectionScheduler } from './lib/collectionScheduler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Simple in-memory rate limiter (100 req/min per IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
app.use((req, res, next) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 200;
  let entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
  } else {
    entry.count++;
  }
  rateLimitMap.set(ip, entry);
  if (entry.count > maxRequests) {
    res.status(429).json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' });
    return;
  }
  next();
});

// Middleware
app.use(cors());
app.use((_req, res, next) => { res.setHeader('ngrok-skip-browser-warning', '1'); next(); });
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Public routes (no auth required)
app.use('/api/auth', authRoutes);
app.use('/api', whatsappRoutes); // includes /api/webhooks/whatsapp (public) + /api/whatsapp/* (protected inside)

// Protected routes (auth required)
app.use('/api/leads', authMiddleware, leadsRoutes);
app.use('/api/campaigns', authMiddleware, campaignsRoutes);
app.use('/api/automations', authMiddleware, automationsRoutes);
app.use('/api/notifications', authMiddleware, notificationsRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/integrations', authMiddleware, integrationsRoutes);
app.use('/api/knowledge', authMiddleware, knowledgeRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/ads', authMiddleware, adsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/collections', authMiddleware, collectionsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Production: serve static frontend
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Frontend build not found. Run npm run build first.' });
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  startCollectionScheduler();
  console.log(`
  ┌─────────────────────────────────────────────────┐
  │                                                 │
  │   🚀 Sellia Backend Server                      │
  │                                                 │
  │   API:    http://localhost:${PORT}/api            │
  │   Health: http://localhost:${PORT}/api/health     │
  │   Mode:   ${process.env.NODE_ENV || 'development'}                        │
  │                                                 │
  └─────────────────────────────────────────────────┘
  `);
});

export default app;
