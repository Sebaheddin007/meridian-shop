# Meridian Shop — Intentionally Vulnerable E-Commerce Training App

> A deliberately vulnerable, full-stack e-commerce web application built for
> hands-on web security training, penetration-testing practice, and
> classroom / CTF use. Modeled to look and feel like a real online store —
> the vulnerabilities are hidden in the code the way they would be in a
> real, imperfect production application, not flagged with obvious labels
> in the UI.

---

 Read Before Running

**This application contains deliberately introduced, exploitable security
vulnerabilities. Do not deploy it on a public server, a shared network, or
any internet-facing host.**

- Run it only on `localhost` / an isolated local Docker container.
- Never reuse its code, patterns, or dependency versions in a real project.
- Do not enter real personal data, real passwords, or real payment
  information anywhere in the app.
- The maintainers are not responsible for any misuse of this software.
  It is provided for **lawful security education and authorized testing
  only** — the same spirit as OWASP Juice Shop, DVWA, or bWAPP.

By downloading, running, or modifying this project you agree to use it
solely for legitimate learning and testing purposes.

---

## What is this?

Meridian Shop is a fictional outdoor & home-goods online store. It looks
and behaves like a normal e-commerce site — browsing products, leaving
reviews, checking out, managing an account, a support desk, an admin
panel, even an AI shopping assistant — but underneath, it contains a wide
range of realistic, intentionally placed vulnerabilities spanning classic
OWASP Top 10 issues as well as more advanced/modern classes (SSRF, XXE,
SSTI, prototype pollution, insecure deserialization, LLM prompt injection,
cache poisoning, and more).

Unlike many training apps, vulnerabilities here are **not signposted in
the UI**. You have to find them the way you would in a real assessment —
by reading responses, probing inputs, and reading the source when you get
stuck.

## Who is this for?

- Students learning web application security
- Developers who want to see real vulnerability patterns in realistic code
- Anyone practicing for OSCP / eJPT / eWPT-style web app sections
- Instructors who want a self-hostable lab environment

## Tech stack

- Node.js + Express
- EJS templating
- `better-sqlite3` (file-based SQLite database)
- Docker (recommended way to run it)

---

## Quick start (Docker — recommended)

```bash
git clone https://github.com/Sebaheddin007/meridian-shop.git
cd meridian-shop
docker build -t meridian-shop:latest .
docker run -d --name meridian-shop -p 3000:3000 meridian-shop:latest
```

Then open: **http://localhost:3000**

The database is seeded automatically on container start (`npm run seed`
runs before `npm start`), so you always begin from a known, clean state.
Restarting the container resets all data.

### Optional: AI shopping assistant

The `/assistant` feature calls the Gemini API and needs an API key. It is
entirely optional — the rest of the app works without it.

```bash
docker run -d --name meridian-shop -p 3000:3000 \
  -e GEMINI_API_KEY="your-key-here" \
  meridian-shop:latest
```

## Quick start (without Docker)

Requires Node.js 20+.

```bash
git clone https://github.com/<your-username>/meridian-shop.git
cd meridian-shop
npm install
npm run seed
npm start
```

Then open: **http://localhost:3000**

> Note: `better-sqlite3` is a native module. If `npm install` fails while
> compiling it, install your platform's C++ build tools (on Windows:
> Visual Studio Build Tools with the "Desktop development with C++"
> workload) — or just use the Docker method above, which avoids this
> entirely.

---

## Default accounts

Seeded automatically by `db/init.js`:

| Username | Password             | Role     |
|----------|-----------------------|----------|
| admin    | C0rrect-Horse-Battery  | admin    |
| carol    | Support2024!           | support  |
| jsmith   | sunshine1              | customer |
| demo     | demo123                | customer |

You can also register a new account from `/register`.

---

## What can you practice here?

A non-exhaustive list of vulnerability classes present in the application
(exact locations are intentionally not detailed here — that's the point):

- SQL Injection (multiple endpoints, including authentication)
- Broken Access Control / IDOR
- Insecure Direct Object References on order data and invoices
- Weak / forgeable session tokens
- XML External Entity (XXE) injection
- Server-Side Request Forgery (SSRF)
- OS command injection
- Server-Side Template Injection (SSTI)
- Insecure deserialization
- Prototype pollution
- Stored Cross-Site Scripting (XSS)
- CORS misconfiguration
- Mass assignment
- NoSQL-style query / filter injection
- Open redirect / OAuth redirect_uri validation flaws
- Business-logic flaws (race conditions, coupon/gift-card abuse)
- Path traversal
- HTTP response cache poisoning / cache deception
- Sensitive information disclosure
- Prompt injection against the AI shopping assistant (indirect, via
  product reviews)

If you want a guided walkthrough with solutions, see
[`SOLUTIONS.md`](./SOLUTIONS.md) — try to solve challenges on your own
first.

---

## Project structure

```
meridian-shop/
├── db/           # database schema + seed data
├── lib/          # shared helpers (db connection, JWT, templating, XML parsing)
├── middleware/    # auth middleware
├── public/        # static assets (css, images)
├── routes/        # Express route handlers, grouped by feature
├── views/         # EJS templates
├── Dockerfile
└── server.js      # application entry point
```

---

## Contributing

Found a way to make a vulnerability more realistic, or want to add a new
one? PRs are welcome. Please keep the same spirit: vulnerabilities should
be realistic mistakes a real team might make, not artificially obvious.

## License

Released under the [MIT License](./LICENSE). See the license file for
details.

## Disclaimer

This project is provided "as is", without warranty of any kind. It is
intended exclusively for educational use in controlled, isolated
environments. The authors and contributors assume no liability for damage
or legal consequences resulting from misuse of this software.
