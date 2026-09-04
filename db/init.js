const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'meridian.db');

// Fresh DB each time we seed
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new Database(DB_PATH);

db.exec(`
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  display_name TEXT,
  avatar_url TEXT DEFAULT '/img/avatar-default.png',
  reset_token TEXT,
  reset_token_expires INTEGER,
  mfa_enabled INTEGER DEFAULT 0,
  api_key TEXT
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  description TEXT,
  image TEXT,
  stock INTEGER DEFAULT 100
);

CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  user_id INTEGER,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  total REAL NOT NULL,
  status TEXT DEFAULT 'processing',
  shipping_address TEXT,
  invoice_note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coupons (
  code TEXT PRIMARY KEY,
  percent_off INTEGER,
  max_uses INTEGER,
  uses INTEGER DEFAULT 0
);

CREATE TABLE gift_cards (
  code TEXT PRIMARY KEY,
  balance REAL
);

CREATE TABLE newsletter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT
);
`);

// --- Seed users ---
// NOTE: passwords are intentionally stored/checked in a weak way in app logic (see routes/auth.js)
const insertUser = db.prepare(`INSERT INTO users (username, email, password, role, display_name, mfa_enabled, api_key) VALUES (?,?,?,?,?,?,?)`);
insertUser.run('admin', 'admin@meridian-outfitters.com', 'C0rrect-Horse-Battery', 'admin', 'Site Administrator', 1, 'mk_live_admin_9f8e7d6c5b4a');
insertUser.run('carol', 'carol@meridian-outfitters.com', 'Support2024!', 'support', 'Carol (Support)', 0, 'mk_live_support_1a2b3c4d');
insertUser.run('jsmith', 'j.smith@example.com', 'sunshine1', 'customer', 'James Smith', 0, 'mk_test_j5m1th');
insertUser.run('demo', 'demo@example.com', 'demo123', 'customer', 'Demo User', 0, 'mk_test_demo0001');

// --- Seed products ---
const insertProduct = db.prepare(`INSERT INTO products (name, slug, category, price, description, image, stock) VALUES (?,?,?,?,?,?,?)`);
const products = [
  [
    'Alpine 40L Trekking Pack',
    'alpine-40l-trekking-pack',
    'Backpacks',
    189.00,
    'A rugged 40-litre pack built for multi-day alpine routes. Adjustable torso, ventilated back panel, and a rain cover tucked into the base pocket.',
    '/images/alpine-trekking-pack.jpg',
    34
  ],
  [
    'Basecamp 2-Person Tent',
    'basecamp-2-person-tent',
    'Shelter',
    249.00,
    'Freestanding double-wall tent with a 3-season rating and a vestibule big enough for two packs.',
    '/images/basecamp-tent.jpg',
    12
  ],
  [
    'Driftwood Wool Blanket',
    'driftwood-wool-blanket',
    'Home',
    79.00,
    'Heavyweight merino throw, woven in a small mill on the coast. Pairs well with a cabin porch and a slow morning.',
    '/images/driftwood-blanket.jpg',
    58
  ],
  [
    'Ridgeline Hiking Boots',
    'ridgeline-hiking-boots',
    'Footwear',
    159.00,
    'Full-grain leather boots with a Vibram outsole, built to be resoled rather than replaced.',
    '/images/ridgeline-boots.jpg',
    27
  ],
  [
    'Ember Cast Iron Skillet',
    'ember-cast-iron-skillet',
    'Kitchen',
    45.00,
    '10-inch pre-seasoned skillet, equally at home over a camp fire or a stovetop.',
    '/images/ember-skillet.jpg',
    71
  ],
  [
    'Solstice Down Jacket',
    'solstice-down-jacket',
    'Apparel',
    219.00,
    '700-fill responsibly sourced down, packable into its own chest pocket.',
    '/images/solstice-jacket.jpg',
    19
  ],
  [
    'Marrow Ceramic Mug Set',
    'marrow-ceramic-mug-set',
    'Home',
    38.00,
    'Set of two hand-thrown mugs, glazed in a warm oat finish.',
    '/images/marrow-mugs.jpg',
    44
  ],
  [
    'Northbound Sleeping Bag',
    'northbound-sleeping-bag',
    'Shelter',
    175.00,
    'Synthetic fill rated to -6C, built for shoulder-season trips where a down bag would be overkill.',
    '/images/northbound-sleeping-bag.jpg',
    22
  ]
];
const productIds = {};
for (const p of products) {
  const info = insertProduct.run(...p);
  productIds[p[1]] = info.lastInsertRowid;
}

// --- Seed reviews ---
const insertReview = db.prepare(`INSERT INTO reviews (product_id, user_id, author, body, rating) VALUES (?,?,?,?,?)`);
insertReview.run(productIds['alpine-40l-trekking-pack'], 3, 'James Smith', 'Carried this through a 6 day traverse and the hip belt never got sore. The rain cover pocket is a nice touch.', 5);
insertReview.run(productIds['alpine-40l-trekking-pack'], null, 'trailrunner_kate', 'Good pack but the side pockets are a bit tight for a 1L bottle.', 4);
insertReview.run(productIds['basecamp-2-person-tent'], null, 'M. Okafor', 'Pitched it in a proper coastal wind and it held up fine. Vestibule fits both packs as promised.', 5);
insertReview.run(productIds['ridgeline-hiking-boots'], null, 'dave_h', 'Took about two weeks to break in but now they are the only boot I reach for.', 4);
insertReview.run(productIds['driftwood-wool-blanket'], null, 'Priya', 'Heavier and warmer than I expected in the best way.', 5);

// --- Seed orders ---
const insertOrder = db.prepare(`INSERT INTO orders (user_id, total, status, shipping_address, invoice_note) VALUES (?,?,?,?,?)`);
insertOrder.run(3, 348.00, 'shipped', '14 Birchwood Ave, Portland, OR', 'Customer requested delivery to side entrance.');
insertOrder.run(4, 79.00, 'processing', '221 Harbor Rd, Seattle, WA', '');
insertOrder.run(1, 45.00, 'delivered', 'Meridian HQ, 500 Warehouse Way, Portland, OR', 'Internal QA test order - restock sample.');

// --- Coupons & gift cards (business logic targets) ---
db.prepare(`INSERT INTO coupons (code, percent_off, max_uses, uses) VALUES (?,?,?,?)`).run('WELCOME10', 10, 1000, 42);
db.prepare(`INSERT INTO coupons (code, percent_off, max_uses, uses) VALUES (?,?,?,?)`).run('STAFF50', 50, 5, 1);
db.prepare(`INSERT INTO gift_cards (code, balance) VALUES (?,?)`).run('MER-GC-4471-9902', 25.00);

console.log('Database seeded at', DB_PATH);
db.close();
