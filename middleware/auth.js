function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// Checks role membership only — does not check per-resource ownership.
// (Left intentionally coarse; several routes rely on this alone.)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).send('Forbidden');
    }
    next();
  };
}

module.exports = { requireLogin, requireRole };
