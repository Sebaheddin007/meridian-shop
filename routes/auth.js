const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../lib/db');
const weakJwt = require('../lib/weakJwt');

// ---------- Login ----------
// Credentials are concatenated directly into the query (SQL injection / auth bypass).
router.get('/login', (req, res) => {
  res.render('login', { title: 'Log in', error: null, host: req.get('host') });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  let user;
  try {
    user = db.prepare(sql).get();
  } catch (e) {
    return res.render('login', { title: 'Log in', error: 'Something went wrong. Please try again.' });
  }

  if (!user) {
    return res.render('login', { title: 'Log in', error: 'Incorrect username or password.' });
  }

  req.session.user = { id: user.id, username: user.username, role: user.role, display_name: user.display_name, avatar_url: user.avatar_url };

  if (req.body.remember_me) {
    const token = weakJwt.sign({ id: user.id, username: user.username, role: user.role, display_name: user.display_name });
    res.cookie('remember_me', token, { maxAge: 1000 * 60 * 60 * 24 * 30, httpOnly: true });
  }

  res.redirect('/account');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ---------- Register ----------
router.get('/register', (req, res) => {
  res.render('register', { title: 'Create account', error: null });
});

router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  try {
    const info = db.prepare('INSERT INTO users (username, email, password, role, display_name, api_key) VALUES (?,?,?,?,?,?)')
      .run(username, email, password, 'customer', username, 'mk_test_' + crypto.randomBytes(6).toString('hex'));
    req.session.user = { id: info.lastInsertRowid, username, role: 'customer', display_name: username, avatar_url: '/img/avatar-default.png' };
    res.redirect('/account');
  } catch (e) {
    res.render('register', { title: 'Create account', error: 'That username or email is already registered.' });
  }
});

// ---------- Forgot / reset password ----------
// Reveals whether an account exists (username/email enumeration), and issues a
// short, predictable numeric reset code with no rate limiting (brute-forceable).
router.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { title: 'Reset password', notice: null, error: null, showCodeForm: false, email: '', resetLink: null });
});

router.post('/forgot-password', (req, res) => {
  const email = req.body.email || '';
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user) {
    return res.render('forgot-password', { title: 'Reset password', notice: null, error: 'We could not find an account with that email address.', showCodeForm: false, email, resetLink: null });
  }

  // 4-digit numeric code, derived predictably and stored for lookup
  const code = String(Math.floor(1000 + (parseInt(crypto.createHash('md5').update(user.username).digest('hex').slice(0, 4), 16) % 9000)));
  const expires = Date.now() + 1000 * 60 * 15;
  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(code, expires, user.id);

  // In a real deployment this would be emailed. Logged here for the demo.
  // The link's host is taken from X-Forwarded-Host when present (to support
  // being deployed behind a reverse proxy), falling back to the Host header —
  // neither of which is validated against a known list of real hostnames.
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const resetLink = `${req.protocol}://${host}/reset-password?email=${encodeURIComponent(user.email)}&code=${code}`;
  console.log(`[password reset] link for ${user.email}: ${resetLink}`);

  res.render('forgot-password', {
    title: 'Reset password',
    notice: 'If that account exists, a reset link has been sent to the email on file.',
    error: null,
    showCodeForm: true,
    email,
    resetLink
  });
});

router.post('/reset-password', (req, res) => {
  const { email, code, new_password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !user.reset_token || user.reset_token !== code || Date.now() > user.reset_token_expires) {
    return res.render('forgot-password', { title: 'Reset password', notice: null, error: 'That code is invalid or has expired.', showCodeForm: true, email, resetLink: null });
  }

  db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(new_password, user.id);
  res.render('login', { title: 'Log in', error: null, resetSuccess: true });
});


router.get('/reset-password', (req, res) => {
  const email = req.query.email || '';
  const code = req.query.code || '';
  res.render('forgot-password', { title: 'Reset password', notice: null, error: null, showCodeForm: true, email, resetLink: null, prefillCode: code });
});

module.exports = router;
