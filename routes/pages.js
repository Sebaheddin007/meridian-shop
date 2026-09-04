const express = require('express');
const router = express.Router();
const db = require('../lib/db');

router.get('/', (req, res) => {
  const featured = db.prepare('SELECT * FROM products ORDER BY id LIMIT 4').all();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const canonicalUrl = `${req.protocol}://${host}/`;
  res.render('home', { title: 'Home', featured, canonicalUrl });
});

router.get('/journal', (req, res) => {
  res.render('journal', { title: 'Journal' });
});

module.exports = router;
