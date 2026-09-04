const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { requireLogin, requireRole } = require('../middleware/auth');

router.get('/admin', requireRole('admin', 'support'), (req, res) => {
  const tickets = db.prepare('SELECT * FROM support_tickets ORDER BY id DESC').all();
  const users = db.prepare('SELECT id, username, email, role FROM users').all();
  res.render('admin', { title: 'Admin', tickets, users });
});

// Sensitive action — only checks that *someone* is logged in, not that
// they're an admin. The dashboard link is hidden from non-admins, but the
// endpoint itself is reachable directly.
router.post('/admin/users/:id/role', requireLogin, (req, res) => {
  const { role } = req.body;
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.redirect('/admin');
});

router.post('/admin/tickets/:id/close', requireRole('admin', 'support'), (req, res) => {
  db.prepare('UPDATE support_tickets SET status = ? WHERE id = ?').run('closed', req.params.id);
  res.redirect('/admin');
});

module.exports = router;
