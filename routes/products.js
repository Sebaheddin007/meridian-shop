const express = require('express');
const router = express.Router();
const db = require('../lib/db');

// --- Shop listing with search + category filter ---
// Both `q` and `category` are concatenated directly into the SQL string.
router.get('/shop', (req, res) => {
  const q = req.query.q || '';
  const category = req.query.category || '';

  // Left over from a deploy script — base64-encoded, easy to miss unless
  // you're looking at response headers closely.
  res.set('X-Build-Info', Buffer.from('build=staging-2026.07;contact=ops@meridian-outfitters.local;note=rotate staging creds before GA').toString('base64'));

  let sql = 'SELECT * FROM products WHERE 1=1';
  if (q) {
    sql += ` AND (name LIKE '%${q}%' OR description LIKE '%${q}%')`;
  }
  if (category) {
    sql += ` AND category = '${category}'`;
  }
  sql += ' ORDER BY id';

  let products = [];
  let errorMsg = null;
  try {
    products = db.prepare(sql).all();
  } catch (e) {
    // Verbose DB error surfaced to the page (info disclosure + confirms injectability)
    errorMsg = e.message;
  }

  res.render('shop', { title: 'Shop', products, query: q, category, errorMsg });
});

// --- Product detail + reviews ---
router.get('/product/:slug', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE slug = ?').get(req.params.slug);
  if (!product) return res.status(404).send('Product not found');
  const reviews = db.prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY id DESC').all(product.id);
  res.render('product', { title: product.name, product, reviews, submitted: req.query.submitted });
});

// review body is rendered unescaped in the view (stored XSS)
router.post('/product/:slug/review', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE slug = ?').get(req.params.slug);
  if (!product) return res.status(404).send('Product not found');

  const author = (req.body.author || 'Anonymous').slice(0, 60);
  const body = (req.body.body || '').slice(0, 1000);
  const rating = Math.min(5, Math.max(1, parseInt(req.body.rating) || 5));

  db.prepare('INSERT INTO reviews (product_id, user_id, author, body, rating) VALUES (?,?,?,?,?)')
    .run(product.id, req.session.user ? req.session.user.id : null, author, body, rating);

  res.redirect(`/product/${product.slug}?submitted=1`);
});

module.exports = router;
