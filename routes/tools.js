const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { exec } = require('child_process');
const db = require('../lib/db');
const { requireRole } = require('../middleware/auth');
const { parseSupplierXml } = require('../lib/xmlParser');
const { renderTemplate } = require('../lib/templater');

// ---------- Network diagnostic tool (OS command injection) ----------
router.get('/admin/diagnostics', requireRole('admin', 'support'), (req, res) => {
  res.render('admin-diagnostics', { title: 'Network diagnostics', output: null, error: null, host: '' });
});

router.post('/admin/diagnostics', requireRole('admin', 'support'), (req, res) => {
  const host = req.body.host || '';
  // The hostname is concatenated straight into a shell command to check
  // whether a supplier's server is reachable before an import job runs.
  exec(`ping -c 1 -W 2 ${host}`, { timeout: 5000 }, (err, stdout, stderr) => {
    res.render('admin-diagnostics', {
      title: 'Network diagnostics',
      output: stdout || stderr || (err ? err.message : ''),
      error: null,
      host
    });
  });
});

// ---------- Supplier stock feed import (XXE) ----------
router.get('/admin/import', requireRole('admin', 'support'), (req, res) => {
  res.render('admin-import', { title: 'Import supplier feed', result: null, error: null });
});

router.post('/admin/import', requireRole('admin', 'support'), (req, res) => {
  const xml = req.body.xml || '';
  try {
    const result = parseSupplierXml(xml);
    res.render('admin-import', { title: 'Import supplier feed', result, error: null });
  } catch (e) {
    res.render('admin-import', { title: 'Import supplier feed', result: null, error: e.message });
  }
});

// ---------- Fetch product image from a supplier URL (SSRF) ----------
router.get('/admin/fetch-image', requireRole('admin', 'support'), (req, res) => {
  res.render('admin-fetch-image', { title: 'Fetch product image', preview: null, error: null, url: '' });
});

router.post('/admin/fetch-image', requireRole('admin', 'support'), async (req, res) => {
  const url = req.body.url || '';
  try {
    // No allowlist on scheme/host — the server will fetch whatever it's given,
    // including internal-only addresses.
    const r = await fetch(url, { timeout: 5000 });
    const text = await r.text();
    res.render('admin-fetch-image', {
      title: 'Fetch product image',
      preview: text.slice(0, 4000),
      error: null,
      url
    });
  } catch (e) {
    res.render('admin-fetch-image', { title: 'Fetch product image', preview: null, error: e.message, url });
  }
});

// An "internal" endpoint that would normally sit behind a firewall in
// production. Reachable directly, and reachable via the fetch-image SSRF above.
router.get('/internal/health', (req, res) => {
  res.json({
    service: 'meridian-inventory-sync',
    status: 'ok',
    env: 'staging',
    build_secret: 'sync-key-77c1-9db4',
    note: 'internal service — should not be reachable from outside the VPC'
  });
});

// ---------- Notify customer (SSTI) ----------
router.get('/admin/notify', requireRole('admin', 'support'), (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 10').all();
  res.render('admin-notify', { title: 'Notify customer', orders, rendered: null, error: null, template: '' });
});

router.post('/admin/notify', requireRole('admin', 'support'), (req, res) => {
  const orderId = parseInt(req.body.order_id);
  const template = req.body.template || '';
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 10').all();

  try {
    const rendered = renderTemplate(template, { order: order || {} });
    res.render('admin-notify', { title: 'Notify customer', orders, rendered, error: null, template });
  } catch (e) {
    res.render('admin-notify', { title: 'Notify customer', orders, rendered: null, error: e.message, template });
  }
});

module.exports = router;
