const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const db = require('../lib/db');
const { requireLogin } = require('../middleware/auth');

// Avatar upload: only checks the declared MIME type from the request (client-controlled)
// and keeps the original file extension — allows uploading .html/.svg with a spoofed
// Content-Type, which then executes when visited directly from /uploads.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'avatar_' + crypto.randomBytes(6).toString('hex') + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Unsupported file type'));
    cb(null, true);
  }
});

router.get('/account', requireLogin, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.session.user.id);
  res.render('account', { title: 'My account', orders, notice: req.query.notice });
});

// No CSRF token on a state-changing action.
router.post('/account/email', requireLogin, (req, res) => {
  const newEmail = req.body.email;
  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(newEmail, req.session.user.id);
  res.redirect('/account?notice=Email+address+updated');
});

router.post('/account/avatar', requireLogin, (req, res) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) return res.redirect('/account?notice=' + encodeURIComponent(err.message));
    if (!req.file) return res.redirect('/account?notice=No+file+uploaded');
    const url = '/uploads/' + req.file.filename;
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(url, req.session.user.id);
    req.session.user.avatar_url = url;
    res.redirect('/account?notice=Avatar+updated');
  });
});

router.get('/account/profile.json', requireLogin, (req, res) => {
  const u = db.prepare('SELECT id, username, email, api_key FROM users WHERE id = ?').get(req.session.user.id);
  res.json(u);
});

module.exports = router;
