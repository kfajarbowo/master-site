'use strict';

const { Router } = require('express');
const ctrl       = require('../../../controllers/auth.controller');

const router = Router();

router.post('/login',  ctrl.login);   // POST /auth/login
router.post('/logout', ctrl.logout);  // POST /auth/logout
router.get('/me',      ctrl.me);      // GET  /auth/me

module.exports = router;
