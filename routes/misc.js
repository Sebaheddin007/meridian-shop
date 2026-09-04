const express = require('express');
const router = express.Router();
const db = require('../lib/db');

function getCart(req) {
  if (!req.session.cart) req.session.cart = [];
  return req.session.cart;
}

router.use((req, res, next) => {
  const cart = getCart(req);
  res.locals.cartCount = cart.reduce((n, i) => n + i.qty, 0);
  next();
});

router.post('/cart/add', (req, res) => {
  const cart = getCart(req);
  const productId = parseInt(req.body.product_id);
  const qty = Math.max(1, parseInt(req.body.qty) || 1);
  const existing = cart.find(i => i.product_id === productId);
  if (existing) existing.qty += qty; else cart.push({ product_id: productId, qty });
  res.redirect('back');
});

router.get('/cart', (req, res) => {
  const cart = getCart(req);
  const items = cart.map(i => {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(i.product_id);
    return product ? { ...product, qty: i.qty } : null;
  }).filter(Boolean);
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  res.render('cart', { title: 'Cart', items, total, couponError: req.query.couponError, couponApplied: req.session.couponApplied || null, giftCardApplied: req.session.giftCardApplied || null });
});

router.post('/cart/coupon', (req, res) => {
  const code = (req.body.code || '').trim();
  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ?').get(code);
  if (!coupon || coupon.uses >= coupon.max_uses) {
    return res.redirect('/cart?couponError=Invalid+or+expired+code');
  }
  req.session.couponApplied = { code: coupon.code, percent_off: coupon.percent_off };
  res.redirect('/cart');
});

router.get('/checkout', (req, res) => {
  const cart = getCart(req);
  if (cart.length === 0) return res.redirect('/cart');
  res.render('checkout', { title: 'Checkout' });
});

router.post('/checkout', (req, res) => {
  const cart = getCart(req);
  const total = cart.reduce((sum, i) => {
    const p = db.prepare('SELECT * FROM products WHERE id = ?').get(i.product_id);
    return sum + (p ? p.price * i.qty : 0);
  }, 0);
  const userId = req.session.user ? req.session.user.id : null;
  if (userId) {
    db.prepare('INSERT INTO orders (user_id, total, status, shipping_address) VALUES (?,?,?,?)')
      .run(userId, total, 'processing', req.body.address || '');
  }
  req.session.cart = [];
  req.session.couponApplied = null;
  res.render('checkout-success', { title: 'Order placed' });
});

// ---------- Save/restore cart via a shareable code (insecure deserialization) ----------
// The exported code is a base64-encoded JS object literal (not strict JSON —
// this predates the JSON-only rewrite and was never revisited). Restoring a
// code runs it through eval() to reconstruct the object.
router.get('/cart/export', (req, res) => {
  const cart = getCart(req);
  const src = `({items:${JSON.stringify(cart)}})`;
  const code = Buffer.from(src).toString('base64');
  res.render('cart-export', { title: 'Save cart', code });
});

router.get('/cart/import', (req, res) => {
  res.render('cart-import', { title: 'Restore cart', error: null });
});

router.post('/cart/import', (req, res) => {
  const code = req.body.code || '';
  try {
    const src = Buffer.from(code, 'base64').toString('utf8');
    const obj = eval(src); // eslint-disable-line no-eval
    req.session.cart = Array.isArray(obj.items) ? obj.items : [];
    res.redirect('/cart');
  } catch (e) {
    res.render('cart-import', { title: 'Restore cart', error: 'That code could not be restored: ' + e.message });
  }
});

router.post('/cart/update-qty', (req, res) => {
  const cart = getCart(req);
  const productId = parseInt(req.body.product_id);
  // No validation that qty is positive — a negative quantity drags the
  // order total down (and, combined with a gift card, can push it negative).
  const qty = parseInt(req.body.qty);
  const item = cart.find(i => i.product_id === productId);
  if (item && !isNaN(qty)) item.qty = qty;
  res.redirect('/cart');
});

// Applies a gift card balance to the order total. Balance is read, then
// (after a small delay simulating a payment-processor round trip) written
// back — with no locking, so firing this twice at once redeems it twice.
router.post('/cart/giftcard', (req, res) => {
  const code = (req.body.code || '').trim();
  const card = db.prepare('SELECT * FROM gift_cards WHERE code = ?').get(code);
  if (!card || card.balance <= 0) {
    return res.redirect('/cart?couponError=Invalid+or+empty+gift+card');
  }
  const amountToApply = card.balance;
  setTimeout(() => {
    const fresh = db.prepare('SELECT * FROM gift_cards WHERE code = ?').get(code);
    db.prepare('UPDATE gift_cards SET balance = ? WHERE code = ?').run(fresh.balance - amountToApply, code);
  }, 400);
  req.session.giftCardApplied = { code, amount: amountToApply };
  res.redirect('/cart');
});

module.exports = router;
