'use strict';

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const session    = require('express-session');
const path       = require('path');

const { env }           = require('./config/env');
const apiV1             = require('./api/v1');
const { errorHandler }  = require('./middlewares/errorHandler');
const { notFound }      = require('./middlewares/notFound');
const { requestLogger } = require('./middlewares/requestLogger');

const app = express();

// ── Security ────────────────────────────────────────────────────────────────
// Disable CSP so the static dashboard can load Google Fonts, inline scripts, etc.
app.use(helmet({ contentSecurityPolicy: false }));

// CORS — wide open for internal mobile clients
app.use(
  cors({
    origin:         true,          // reflect request origin (needed for cookies)
    credentials:    true,          // allow cookies cross-origin
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key'],
  })
);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Session ──────────────────────────────────────────────────────────────────
app.use(
  session({
    secret:            env.SESSION_SECRET,
    resave:            false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure:   env.NODE_ENV === 'production', // HTTPS only in prod
      sameSite: 'lax',
      maxAge:   8 * 60 * 60 * 1000,           // 8 hours
    },
  })
);

// ── Rate limiting (API only) ─────────────────────────────────────────────────
app.use(
  '/api',
  rateLimit({
    windowMs:        15 * 60 * 1000, // 15 min
    max:             500,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { status: 'error', message: 'Too many requests, please try again later.' },
  })
);

// ── Request logger ───────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Static files (dashboard) ─────────────────────────────────────────────────
app.use(
  express.static(path.join(__dirname, '../public'), {
    maxAge: '1h',
    index:  false,          // disable auto-serve index.html — we handle it manually
  })
);

// ── Health check (no auth) ───────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', apiV1);

// ── 404 for unmatched API routes ─────────────────────────────────────────────
app.use('/api', notFound);

// ── SPA / dashboard routing ──────────────────────────────────────────────────
// /login → serve login page
app.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// All other non-API routes → serve dashboard (SPA)
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;
