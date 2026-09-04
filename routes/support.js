const express = require('express');
const router = express.Router();
const db = require('../lib/db');

router.get('/support', (req, res) => {
  res.render('support', { title: 'Support' });
});

router.get('/support/new', (req, res) => {
  res.render('support-new', { title: 'Contact support', error: null });
});

router.post('/support/new', (req, res) => {
  const { subject, message, email } = req.body;
  const userId = req.session.user ? req.session.user.id : null;
  db.prepare('INSERT INTO support_tickets (user_id, subject, message, status) VALUES (?,?,?,?)')
    .run(userId, subject, `From: ${email}\n\n${message}`, 'open');
  res.render('support-thanks', { title: 'Message sent' });
});

router.get('/support/chat', (req, res) => {
  res.render('chat', { title: 'Live chat' });
});

module.exports = router;
