# Production Deployment & Hosting Guide

This guide details step-by-step instructions for deploying the recruiter portfolio application to production environments including Vercel, Render, Railway, and standard Linux VPS servers.

---

## 1. Architecture Overview

- **Runtime**: Node.js (v18.0.0+ recommended)
- **External Dependencies**: Zero runtime npm dependencies (uses native `node:http`, `node:fs`, `node:path`, `node:crypto`).
- **Data Storage**: Local atomic JSON store located in `/data` (`portfolio-db.json`, `auth.json`, `messages.json`, `sessions.json`, `settings.json`).
- **Assets**: Static assets served from `/assets`, `/css`, and `/js`.
- **Security**: Server-side route guards, HttpOnly SameSite=Strict session cookies, CSRF protection on mutations, and strict static file access controls.

---

## 2. Environment Variables

Configure these variables in your hosting provider's dashboard:

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | Optional | `4173` | Server listening port (auto-assigned by cloud hosts). |
| `NODE_ENV` | Recommended | `production` | Run mode. |
| `OWNER_EMAIL` | Required | `raghavendraraghu71537@gmail.com` | Email address of the portfolio owner. |
| `OWNER_PASSWORD` | First-boot | - | Initial owner password (min 10 chars). Hashed with scrypt on startup. |
| `SITE_URL` | Optional | `https://jraghavendra.dev` | Canonical site domain. |

> [!IMPORTANT]
> Never commit `.env` or raw passwords to Git. The `.gitignore` should always ignore `.env`.

---

## 3. Deployment Options

### Option A: Vercel

1. Push your repository to GitHub / GitLab / Bitbucket.
2. In the Vercel Dashboard, click **Add New Project** and select your repository.
3. The project includes [`vercel.json`](file:///C:/Users/Admin/.gemini/antigravity-ide/scratch/recruiter-portfolio/vercel.json) preconfigured with `@vercel/node`.
4. In **Environment Variables**, add:
   - `OWNER_EMAIL`: `your.email@gmail.com`
   - `OWNER_PASSWORD`: `YourSecurePassword123!`
5. Click **Deploy**.
6. Post-deployment, visit `https://your-project.vercel.app/admin/login` to access the owner dashboard.

### Option B: Render / Railway / Fly.io

1. Create a new **Web Service**.
2. Connect your repository.
3. Configure:
   - **Build Command**: `npm run generate-resume` (optional)
   - **Start Command**: `npm start` (runs `node server.js`)
4. In **Environment Variables**, add `OWNER_EMAIL` and `OWNER_PASSWORD`.
5. For persistent disk on Render/Railway, attach a persistent volume to the `/data` directory if message persistence across redeployments is desired.

### Option C: Linux VPS (Ubuntu / Debian with PM2 & NGINX)

1. Clone the repository to `/var/www/portfolio`:
   ```bash
   git clone <repo-url> /var/www/portfolio
   cd /var/www/portfolio
   ```
2. Create `.env`:
   ```bash
   cp .env.example .env
   nano .env
   ```
3. Run database migrations:
   ```bash
   npm run migrate
   ```
4. Run verification tests:
   ```bash
   npm run test:backend
   npm test
   ```
5. Start with PM2:
   ```bash
   pm2 start server.js --name "portfolio"
   pm2 save
   pm2 startup
   ```
6. Reverse-proxy port 4173 in NGINX with SSL (Let's Encrypt / Certbot).

---

## 4. Routes & Endpoints Reference

### Public Routes (Read-Only)
- `/` — Homepage & hero showcase
- `/projects` — Project catalog with category filtering
- `/projects/[slug]` — Deep-dive technical case study (e.g. `/projects/traceflow`)
- `/experience` — Career timeline and internship impact metrics
- `/skills` — Technical skill hierarchy across 8 categories
- `/achievements` — Honors, distinctions, and hackathons
- `/about` — Technical introduction, philosophy, and focus
- `/resume` — Interactive ATS resume preview and download
- `/contact` — Communication channels and contact inquiry form
- `/404` — Branded resource not found page
- `/robots.txt` — Search crawler directives
- `/sitemap.xml` — Canonical search engine index
- `/resume.pdf` — Direct download shortcut for resume PDF

### Public API Endpoints
- `GET /api/public/data` — Sanitized portfolio data
- `POST /api/contact` — Recruiter inquiry submission (honeypot protected, rate-limited)
- `POST /api/auth/login` — Owner authentication
- `POST /api/auth/logout` — Owner session revocation
- `GET /api/auth/status` — Current session status

### Protected Admin Routes (`/admin/*`)
Requires authenticated owner session. Unauthenticated requests are redirected with 302 to `/admin/login`.
- `/admin/dashboard`
- `/admin/profile`
- `/admin/projects`
- `/admin/experience`
- `/admin/skills`
- `/admin/achievements`
- `/admin/about`
- `/admin/resume`
- `/admin/messages`
- `/admin/settings`

### Protected Admin REST Endpoints (`/api/admin/*`)
Requires valid session cookie AND `x-csrf-token` header for state-mutating requests (`POST`, `PUT`, `DELETE`).
- `GET /api/admin/dashboard`
- `GET / PUT /api/admin/profile`
- `GET / POST / PUT / DELETE /api/admin/projects`
- `POST /api/admin/projects/reorder`
- `GET / POST / PUT / DELETE /api/admin/experience`
- `GET / POST / PUT / DELETE /api/admin/skills`
- `GET / POST / PUT / DELETE /api/admin/achievements`
- `GET / PUT /api/admin/about`
- `GET / PUT /api/admin/resume`
- `POST /api/admin/resume/upload` (magic bytes %PDF- and 5MB limit enforced)
- `GET / PUT / DELETE /api/admin/messages`
- `GET / PUT /api/admin/settings`
- `POST /api/admin/settings/password`

---

## 5. Security Summary & Operational Best Practices

1. **Password Security**: Passwords are never stored in plaintext. Hashing utilizes `crypto.scryptSync` with a 128-bit cryptographic salt and constant-time verification (`timingSafeEqual`).
2. **Session Cookies**: Session cookies are marked `HttpOnly` and `SameSite=Strict`.
3. **Data Privacy**: Static handlers explicitly reject requests to `data/`, `server/`, `.env`, and server code with `HTTP 403`.
4. **File Uploads**: Validates `%PDF-` header bytes, enforces 5MB ceilings, and writes to a non-user-controlled destination path.
