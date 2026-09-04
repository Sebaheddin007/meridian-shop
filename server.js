const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));
// Leftover ops folder, served statically and unlinked from any page —
// only discoverable via robots.txt or directory guessing (info disclosure).
app.use('/backup', express.static(path.join(__dirname, 'config')));

app.use(session({
  secret: 'meridian-dev-secret-change-me', // weak, predictable secret (intentional)
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }
}));

// make current user available to all views
app.use((req, res, next) => {
  if (!req.session.user && req.cookies.remember_me) {
    try {
      const weakJwt = require('./lib/weakJwt');
      const payload = weakJwt.verify(req.cookies.remember_me);
      req.session.user = { id: payload.id, username: payload.username, role: payload.role, display_name: payload.display_name };
    } catch (e) {
      // ignore invalid/forged tokens that fail even the weak check
    }
  }
  res.locals.user = req.session.user || null;
  res.locals.path = req.path;
  next();
});

// ----- Shared HTTP cache (simulates a CDN/reverse-proxy cache) -----
// Keyed only by pathname — ignores query string, cookies, and the
// Authorization/session state entirely. Anything that looks like a static
// asset (by extension) gets cached for a minute, and the homepage is cached
// too. This is what makes both cache poisoning and cache deception possible.
const sharedCache = new Map();
const CACHE_TTL_MS = 60 * 1000;
const CACHEABLE_PATTERN = /\.(json|css|js|jpg|jpeg|png|gif|txt)$/i;

app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  const cacheable = req.path === '/' || CACHEABLE_PATTERN.test(req.path);
  if (!cacheable) return next();

  const key = req.path; // no Vary on cookie, host, or headers
  const hit = sharedCache.get(key);
  if (hit && Date.now() - hit.time < CACHE_TTL_MS) {
    res.set('X-Cache', 'HIT');
    return res.status(hit.status).type(hit.type).send(hit.body);
  }

  const originalSend = res.send.bind(res);
  res.send = (body) => {
    if (res.statusCode === 200) {
      sharedCache.set(key, { body, status: res.statusCode, type: res.get('Content-Type') || 'text/html', time: Date.now() });
    }
    res.set('X-Cache', 'MISS');
    return originalSend(body);
  };
  next();
});
app.use('/', require('./routes/pages'));
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/products'));
app.use('/', require('./routes/account'));
app.use('/', require('./routes/orders'));
app.use('/', require('./routes/admin'));
app.use('/', require('./routes/tools'));
app.use('/', require('./routes/support'));
app.use('/', require('./routes/settings'));
app.use('/', require('./routes/oauth'));
app.use('/', require('./routes/graphql'));
app.use('/', require('./routes/assistant'));
app.use('/api', require('./routes/api'));
app.use('/', require('./routes/misc'));

// generic error handler - deliberately verbose (information disclosure)
app.use((err, req, res, next) => {
  res.status(500);
  res.send(`<pre>${err.stack}</pre>`);
});

// ----- Live chat WebSocket -----
// No Origin check on the upgrade request, and messages are broadcast to
// every connected client verbatim (no output sanitization).
const wss = new WebSocket.Server({ server, path: '/chat' });
wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let payload;
    try { payload = JSON.parse(raw); } catch (e) { return; }
    const name = String(payload.name || 'Guest').slice(0, 40);
    const text = String(payload.text || '').slice(0, 500);
    const html = `<strong>${name}:</strong> ${text}`;
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(html);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Meridian running at http://localhost:${PORT}`);
});
