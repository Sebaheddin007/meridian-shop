const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../lib/db');
const { requireLogin } = require('../middleware/auth');

// Order detail — checks that the caller is logged in, but not that the
// order actually belongs to them (IDOR: increment/guess the id).
router.get('/account/orders/:id', requireLogin, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).send('Order not found');
  res.render('order-detail', { title: `Order #${order.id}`, order });
});

// Invoice download — filename comes from a query parameter and is joined
// onto the invoices directory without normalizing `..` segments.
router.get('/account/orders/:id/invoice', requireLogin, (req, res) => {
  const file = req.query.file || `${req.params.id}.txt`;
  const filePath = path.join(__dirname, '..', 'invoices', file);

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(404).send('Invoice file not found.');
    res.type('text/plain').send(data);
  });
});

module.exports = router;
