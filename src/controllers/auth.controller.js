'use strict';

const bcrypt               = require('bcryptjs');
const { prisma }           = require('../config/database');
const { success, createError } = require('../utils/response');

/**
 * POST /auth/login
 * Body: { username, password }
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return next(createError(400, 'Username dan password wajib diisi.'));
    }

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || !user.isActive) {
      return next(createError(401, 'Username atau password salah.'));
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return next(createError(401, 'Username atau password salah.'));
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
    });

    // Persist minimal info in session
    req.session.userId      = user.id;
    req.session.username    = user.username;
    req.session.displayName = user.displayName;
    req.session.role        = user.role;

    return success(res, {
      username:    user.username,
      displayName: user.displayName,
      role:        user.role,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/logout
 */
function logout(req, res, next) {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    return res.json({ status: 'success', message: 'Logged out.' });
  });
}

/**
 * GET /auth/me
 * Returns current session info, or 401 if not logged in.
 */
function me(req, res, next) {
  if (!req.session.userId) {
    return next(createError(401, 'Not authenticated.'));
  }
  return success(res, {
    username:    req.session.username,
    displayName: req.session.displayName,
    role:        req.session.role,
  });
}

module.exports = { login, logout, me };
