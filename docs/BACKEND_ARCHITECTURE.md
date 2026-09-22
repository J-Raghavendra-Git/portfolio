# Production Backend Architecture & Data Specifications

This document outlines the architecture, data models, security boundaries, and migration systems powering the portfolio application.

---

## 1. Architectural Philosophy

The backend is built with zero unnecessary third-party runtime bloat using **native Node.js primitives (`http`, `crypto`, `fs`, `path`)**.
- **Cold Start**: Sub-50ms
- **Memory Footprint**: < 35MB RSS
- **Portability**: Runs on Node.js 18+ on any cloud provider, container, or serverless runtime.
- **Reliability**: Crash-resistant JSON persistence with atomic writes (`atomicWriteJson`) utilizing write-then-rename (`fs.renameSync`).

---

## 2. Persistent Models & Data Entities

The application models 10 distinct entities structured across dedicated persistence files in `/data`:

### Model 1: Owner / User (`data/auth.json`)
Contains exactly one portfolio owner account.
- `id` (String): Unique identifier (e.g. `owner-admin`).
- `email` (String): Normalized owner email address.
- `passwordHash` (String, 128 chars): Cryptographic hash derived via `crypto.scrypt` (N=16384, r=8, p=1).
- `salt` (String, 32 hex chars): 128-bit cryptographic salt generated via `crypto.randomBytes(16)`.
- `createdAt` (ISO String): Account creation timestamp.
- `updatedAt` (ISO String): Account modification timestamp.

### Model 2: Profile (`data/portfolio-db.json -> profile`)
Candidate bio and identity details.
- `name` (String): Candidate name ("J Raghavendra").
- `title` (String): Candidate role title.
- `headline` (String): Headline / primary emphasis.
- `bio` (String): Long-form narrative biography.
- `location` (String): Physical location / timezone.
- `status` (String): Availability status.
- `links` (Object): Social and professional profile URLs (`github`, `linkedin`, `email`).
- `updatedAt` (ISO String): Last updated timestamp.

### Model 3: Projects (`data/portfolio-db.json -> projects`)
Engineering case studies and projects with relational slug lookup.
- `id` (String): Unique identifier (`proj-<timestamp>`).
- `slug` (String): URL-safe route slug (e.g. `traceflow`, `aurakv`).
- `title` (String): Project title.
- `category` (String): System category (e.g. `Systems`, `Networking`).
- `shortDescription` (String): Brief card summary.
- `problem` (String): Problem statement.
- `solution` (String): Architectural solution.
- `architecture` (String): Architectural description / patterns.
- `metrics` (Array of Objects): Key benchmark outcomes (`{ label, value }`).
- `technologies` (Array of Strings): Stack tags.
- `featured` (Boolean): Flag for hero/pinned display.
- `createdAt` (ISO String): Creation timestamp.
- `updatedAt` (ISO String): Last updated timestamp.

### Model 4: Experience (`data/portfolio-db.json -> experience`)
Work history and engineering roles.
- `id` (String): Unique identifier (`exp-<timestamp>`).
- `role` (String): Job title.
- `organization` (String): Company or lab name.
- `startDate` (String): Start period.
- `endDate` (String): End period (or "Present").
- `highlights` (Array of Strings): Key achievements and contributions.
- `technologies` (Array of Strings): Technologies utilized.
- `createdAt` (ISO String): Creation timestamp.
- `updatedAt` (ISO String): Last updated timestamp.

### Model 5: Skills (`data/portfolio-db.json -> skills`)
Categorized technical skill taxonomy.
- `categories` (Array of Strings): Category list.
- `items` (Array of Objects): Individual skills:
  - `id` (String): `skill-<timestamp>`.
  - `name` (String): Skill name.
  - `category` (String): Associated category.
  - `level` (String): Proficiency level (`Core`, `Advanced`, `Familiar`).
  - `createdAt` (ISO String): Creation timestamp.
  - `updatedAt` (ISO String): Last updated timestamp.

### Model 6: Achievements (`data/portfolio-db.json -> achievements`)
Awards, publications, and competitive recognitions.
- `id` (String): Unique identifier (`ach-<timestamp>`).
- `title` (String): Honor or award title.
- `organization` (String): Granting institution.
- `category` (String): Distinction category.
- `date` (String): Date awarded.
- `description` (String): Narrative description.
- `link` (String): External verification URL.
- `createdAt` (ISO String): Creation timestamp.
- `updatedAt` (ISO String): Last updated timestamp.

### Model 7: About (`data/portfolio-db.json -> about`)
In-depth narrative, engineering philosophy, and career direction.
- `headline` (String): About headline.
- `intro` (String): Introduction text.
- `philosophy` (Array of Objects): Guiding engineering principles (`{ title, description }`).
- `currentFocus` (String): What the candidate is actively learning/building.
- `careerDirection` (String): Target roles and engineering focus.
- `updatedAt` (ISO String): Last updated timestamp.

### Model 8: Resume Metadata (`data/portfolio-db.json -> resume`)
Resume metadata and structural content mirrors.
- `fileName` (String): Canonical resume file name.
- `fileSize` (String): Formatted size representation.
- `version` (String): Resume version tag.
- `lastUploaded` (ISO String): Last upload timestamp.
- `sections` (Object): Structured education, experience, and project highlights.
- `updatedAt` (ISO String): Last updated timestamp.

### Model 9: ContactMessages (`data/messages.json`)
Private incoming recruiter inquiries.
- `id` (String): Unique message identifier (`msg-<timestamp>`).
- `name` (String, max 100): Sender name.
- `email` (String, max 120): Sender email address.
- `subject` (String, max 150): Message subject.
- `message` (String, max 5000): Inbound message body.
- `ipHash` (String, 16 hex chars): Privacy-preserving SHA-256 hash of sender IP.
- `read` (Boolean): Read status flag.
- `archived` (Boolean): Archive status flag.
- `createdAt` (ISO String): Submission timestamp.

### Model 10: SiteSettings (`data/settings.json`)
Runtime site behavior controls.
- `siteStatus` (String): `"live"` or `"maintenance"`.
- `portfolioVisibility` (String): `"public"` or `"private"`.
- `contactAvailability` (Boolean): Whether the contact form accepts inquiries.
- `recruiterSlaText` (String): Response expectation SLA.
- `seoDefaults` (Object): Default title prefixes and meta descriptions.
- `themePreference` (String): `"dark-first"` or `"light"`.
- `lastUpdated` (ISO String): Modification timestamp.

---

## 3. Authentication & Session Architecture

### Password Hashing
- Algorithm: `scrypt` via `crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })`.
- Salt: 16 bytes (128 bits) of cryptographic random bytes generated per owner.
- Comparison: Constant-time buffer comparison `crypto.timingSafeEqual` prevents timing attacks.

### Sessions & CSRF
- **Session Tokens**: 32 bytes (256 bits) of cryptographically random hex (`crypto.randomBytes(32)`).
- **Cookie Security**:
  - `HttpOnly`: Prevents client-side script inspection (mitigating XSS theft).
  - `SameSite=Strict`: Prevents cross-site cookie transmission (mitigating CSRF).
  - `Path=/`: Restricts scope to application root.
  - `Max-Age=86400`: 24-hour expiration.
- **CSRF Tokens**: Dedicated per-session cryptographic token (`x-csrf-token`) required on all mutating requests (`POST`, `PUT`, `DELETE`).

---

## 4. Authorization & Security Barriers

| Resource / Endpoint | Public Access | Authenticated Owner Access |
|---|---|---|
| `GET /` & Public Pages | 200 OK | 200 OK |
| `GET /api/public/data` | 200 OK (Sanitized) | 200 OK |
| `POST /api/contact` | 200 OK (Write-Only) | 200 OK |
| `GET /admin/*` (Views) | 302 Redirect to `/admin/login` | 200 OK |
| `GET /api/admin/*` | 401 Unauthorized | 200 OK |
| `POST /api/admin/*` | 401 Unauthorized | 200 OK (Requires CSRF) |
| `PUT /api/admin/*` | 401 Unauthorized | 200 OK (Requires CSRF) |
| `DELETE /api/admin/*` | 401 Unauthorized | 200 OK (Requires CSRF) |
| `GET /data/*`, `/.env` | 403 Forbidden | 403 Forbidden (Never served) |

---

## 5. File Storage & Upload Security

Resume uploads (`POST /api/admin/resume/upload`) enforce:
1. **Authentication**: Must be authenticated owner with valid session and CSRF token.
2. **Magic Bytes Validation**: Buffer must start with `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`). Any binary not matching magic bytes (e.g. Windows PE executables starting with `MZ`) is rejected immediately with 400 Bad Request.
3. **Size Ceiling**: Maximum 5MB (`5 * 1024 * 1024` bytes). Oversized files are rejected with 400.
4. **Safe Destination Path**: Files are saved strictly to predetermined paths:
   - `assets/Alex_Rivera_Software_Engineer_Resume.pdf`
   - `assets/resume/Alex_Rivera_Software_Engineer_Resume.pdf`
   No client-supplied file paths or filenames are ever trusted.

---

## 6. Schema Migrations

The migration engine (`server/migrations.js`) automatically initializes and versions the schema:
- Schema metadata tracked in `data/schema-version.json`.
- Automatically executes on server startup via `server/db.js`.
- Can be run manually via CLI:
  ```bash
  npm run migrate
  ```
- **Migration 001**: Initial schema bootstrap (creates missing data files with complete base structures).
- **Migration 002**: Timestamps and relational normalization (ensures ISO timestamps across all entities, guarantees unique project slugs, and initializes message flags).

---

## 7. Testing & Verification

The backend is backed by three test suites:
- **15-Point Backend Verification** (`npm run test:backend`):
  Tests all 15 explicit requirements: Login, Logout, Unauthorized Access, Unauthorized Mutations, Project CRUD, Experience CRUD, Skills CRUD, Achievements CRUD, Profile Update, About Update, Resume Upload/Replacement, Contact Submission, Owner Message Access, Public Read Access, and Private Data Isolation.
- **Full Security Audit** (`npm test`):
  124 automated assertions covering route guards, data privacy, traversal prevention, CSRF, and static file security.
- **Admin System Test** (`npm run test:admin`):
  78 end-to-end assertions testing session cookies, dashboard stats, and CRUD workflows.
