const express = require('express');
const router = express.Router();
const db = require('../lib/db');

// ---------- CORS misconfiguration ----------
// Reflects whatever Origin the browser sends, and allows credentials — so
// any site can read this response from a logged-in victim's browser.
router.use((req, res, next) => {
  if (req.headers.origin) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'Missing X-Api-Key header' });
  const user = db.prepare('SELECT * FROM users WHERE api_key = ?').get(key);
  if (!user) return res.status(401).json({ error: 'Invalid API key' });
  req.apiUser = user;
  next();
}

router.get('/products', (req, res) => {
  const products = db.prepare('SELECT id, name, slug, category, price FROM products').all();
  res.json(products);
});

// Returns the caller's own account — reads session OR API key.
router.get('/me', apiKeyAuth, (req, res) => {
  const u = req.apiUser;
  res.json({ id: u.id, username: u.username, email: u.email, role: u.role, api_key: u.api_key });
});

// ---------- Mass assignment ----------
// Whatever JSON object the client sends is merged straight onto the user
// row — including fields like `role` that were never meant to be client-editable.
router.put('/me', apiKeyAuth, (req, res) => {
  const updates = req.body || {};
  const allowedColumns = ['username', 'email', 'display_name', 'role', 'password'];
  const setClauses = [];
  const values = [];
  for (const key of Object.keys(updates)) {
    if (allowedColumns.includes(key)) {
      setClauses.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }
  if (setClauses.length === 0) return res.status(400).json({ error: 'No valid fields' });
  values.push(req.apiUser.id);
  db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  const updated = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(req.apiUser.id);
  res.json(updated);
});

// ---------- "Smart search" — NoSQL-style query matcher ----------
// The mobile app sends a JSON filter object that's applied directly against
// each product with a hand-rolled MongoDB-style operator matcher — including
// $ne / $gt / $regex — so filters can be turned into a boolean-blind
// injection primitive against fields the UI never exposes (e.g. stock).
function matches(doc, filter) {
  for (const [field, cond] of Object.entries(filter)) {
    const val = doc[field];
    if (cond !== null && typeof cond === 'object') {
      for (const [op, opVal] of Object.entries(cond)) {
        if (op === '$ne' && !(val !== opVal)) return false;
        if (op === '$gt' && !(val > opVal)) return false;
        if (op === '$lt' && !(val < opVal)) return false;
        if (op === '$regex' && !(new RegExp(opVal).test(String(val)))) return false;
      }
    } else if (val !== cond) {
      return false;
    }
  }
  return true;
}

router.post('/search', (req, res) => {
  const filter = req.body.filter || {};
  const all = db.prepare('SELECT * FROM products').all();
  const results = all.filter(p => matches(p, filter));
  res.json(results);
});

// Debug/status endpoint left over from development. Malformed input throws,
// and the global error handler renders the raw stack trace to the client.
router.get('/debug/parse', (req, res, next) => {
  try {
    const parsed = JSON.parse(req.query.input);
    res.json({ ok: true, parsed });
  } catch (e) {
    next(e); // falls through to the verbose error handler in server.js
  }
});

module.exports = router;
