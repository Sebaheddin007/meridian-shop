const express = require('express');
const router = express.Router();
const db = require('../lib/db');

// A hand-rolled, minimal GraphQL-style endpoint (no real graphql-js
// dependency). Supports a couple of query "operations" selected by a
// naive string match on the query body. No authentication or field-level
// authorization is applied — the `users` query returns every column,
// password included, to any caller.
router.post('/graphql', express.json(), (req, res) => {
  const query = (req.body && req.body.query) || '';

  if (/__schema/.test(query)) {
    return res.json({
      data: {
        __schema: {
          types: [
            { name: 'User', fields: ['id', 'username', 'email', 'password', 'role', 'api_key'] },
            { name: 'Product', fields: ['id', 'name', 'price', 'stock', 'category'] },
            { name: 'Order', fields: ['id', 'userId', 'total', 'status', 'shippingAddress'] }
          ],
          queries: ['users', 'user(id)', 'products', 'orders']
        }
      }
    });
  }

  if (/\busers\b/.test(query)) {
    const users = db.prepare('SELECT * FROM users').all();
    return res.json({ data: { users } });
  }

  if (/\buser\s*\(/.test(query)) {
    const m = query.match(/user\s*\(\s*id\s*:\s*"?(\d+)"?\s*\)/);
    const id = m ? m[1] : null;
    const user = id ? db.prepare('SELECT * FROM users WHERE id = ?').get(id) : null;
    return res.json({ data: { user } });
  }

  if (/\borders\b/.test(query)) {
    const orders = db.prepare('SELECT * FROM orders').all();
    return res.json({ data: { orders } });
  }

  if (/\bproducts\b/.test(query)) {
    const products = db.prepare('SELECT * FROM products').all();
    return res.json({ data: { products } });
  }

  res.json({ errors: [{ message: 'Unknown query. Try { __schema { types } }' }] });
});

router.get('/graphql', (req, res) => {
  res.type('text/plain').send(
    'This endpoint accepts POST requests with a JSON body: {"query": "..."}\n' +
    'Try: {"query": "{ __schema { types } }"}\n' +
    'Or:  {"query": "{ users { id username } }"}'
  );
});

module.exports = router;
