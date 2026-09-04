const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../lib/db');
const { requireLogin } = require('../middleware/auth');

const codes = {}; // in-memory auth code store: code -> { userId, expires }

router.get('/oauth/authorize', requireLogin, (req, res) => {
  const { client_id, redirect_uri, state } = req.query;
  res.render('oauth-consent', { title: 'Authorize app', client_id, redirect_uri, state });
});

router.post('/oauth/authorize', requireLogin, (req, res) => {
  const { client_id, redirect_uri, state } = req.body;
  const host = req.get('host'); // e.g. "localhost:3000"

  // Flawed check: only requires the current host to appear *somewhere* in
  // the redirect_uri, rather than validating it against an exact allowlist
  // of registered callback URLs. "http://localhost:3000.attacker.com/cb" or
  // "https://attacker.com/?ok=localhost:3000" both pass this check.
  if (!redirect_uri || !host || !redirect_uri.includes(host)) {
    return res.status(400).send('Invalid redirect_uri for this client.');
  }

  const code = crypto.randomBytes(16).toString('hex');
  codes[code] = { userId: req.session.user.id, expires: Date.now() + 60000 };

  const sep = redirect_uri.includes('?') ? '&' : '?';
  res.redirect(`${redirect_uri}${sep}code=${code}&state=${encodeURIComponent(state || '')}`);
});

router.get('/oauth/callback', (req, res) => {
  const { code } = req.query;
  const entry = codes[code];
  if (!entry || Date.now() > entry.expires) {
    return res.status(400).send('Invalid or expired authorization code.');
  }
  delete codes[code];
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(entry.userId);
  req.session.user = { id: user.id, username: user.username, role: user.role, display_name: user.display_name, avatar_url: user.avatar_url };
  res.redirect('/account?notice=Signed+in+with+MeridianID');
});

module.exports = router;
