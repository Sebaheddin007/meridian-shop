const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');

// In-memory per-process settings store (fine for a demo app).
const defaultSettings = { theme: 'light', notifications: { email: true, sms: false } };
let sharedSettingsObject = {}; // plain object — polluting Object.prototype affects this too

// Naive recursive merge — does not guard against __proto__ / constructor keys.
function merge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      merge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

router.get('/account/settings', requireLogin, (req, res) => {
  const userSettings = merge(JSON.parse(JSON.stringify(defaultSettings)), sharedSettingsObject[req.session.user.id] || {});
  res.render('account-settings', { title: 'Preferences', settings: userSettings, saved: req.query.saved });
});

// Accepts an arbitrary JSON body and merges it into the user's settings
// object with the naive merge above.
router.post('/account/settings', requireLogin, express.json(), (req, res) => {
  if (!sharedSettingsObject[req.session.user.id]) sharedSettingsObject[req.session.user.id] = {};
  merge(sharedSettingsObject[req.session.user.id], req.body || {});
  res.redirect('/account/settings?saved=1');
});

// A harmless-looking endpoint whose behavior silently changes once
// Object.prototype has been polluted (e.g. isAdminPreview becoming truthy
// for every object because it was set on the prototype).
router.get('/account/settings/preview', requireLogin, (req, res) => {
  const obj = {};
  res.json({ preview_mode: !!obj.isAdminPreview, settings: obj });
});

module.exports = router;
