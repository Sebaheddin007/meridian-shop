const crypto = require('crypto');

// Weak, guessable signing secret (would be in a wordlist).
const SECRET = 'meridian';

function b64url(input) {
  return Buffer.from(JSON.stringify(input)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return JSON.parse(Buffer.from(str, 'base64').toString('utf8'));
}

function sign(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = b64url(header);
  const p = b64url(payload);
  const sig = crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${h}.${p}.${sig}`;
}

// Accepts tokens with alg:"none" (no signature check at all), and otherwise
// verifies HS256 against a weak hardcoded secret.
function verify(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [h, p, s] = parts;
  const header = b64urlDecode(h);
  const payload = b64urlDecode(p);

  if (header.alg === 'none') {
    return payload; // no signature verification performed
  }

  const expectedSig = crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (expectedSig !== s) throw new Error('Invalid signature');
  return payload;
}

module.exports = { sign, verify };
