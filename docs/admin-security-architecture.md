# Private Owner-Only Dashboard & Security Architecture

This document defines the architectural foundation, data persistence contracts, and server-side security model for the private owner management interface:
- `/admin/projects`
- `/admin/experience`
- `/admin/skills`
- `/admin/achievements`
- `/admin/about`
- `/admin/resume`
- `/admin/contact`
- `/admin/messages`

---

## 1. Core Security Tenets

1. **Frontend Visibility is Never Authorization**: Hiding an edit button or obfuscating an admin URL does not provide security. All state mutations and administrative actions must be strictly authenticated, validated, and authorized on the server/backend.
2. **Zero Public Edit Capabilities**: Public visitors must never have write, delete, reorder, or upload access to any database, file storage, or configuration endpoint. The public web pages (`/`, `/about`, `/projects`, `/experience`, `/skills`, `/achievements`, `/resume`, `/contact`) are strictly read-only views rendered from authenticated data sources.
3. **Owner-Only Authentication**: Only the portfolio owner possessing verified administrative credentials (MFA / passkeys / secure session) may create, modify, reorder, or delete entries.
4. **Absolute Privacy for Contact Submissions**: Public visitors may dispatch messages via `/api/contact`, but can NEVER list, inspect, read, or delete submissions. Only the authenticated portfolio owner can access `/admin/messages` and `/api/admin/messages`.
5. **Explicit Rejection of Unauthorized Traffic**: Any visitor attempting to directly invoke admin API routes or access `/admin/*` without an active, verified owner session must receive an immediate `401 Unauthorized` or `403 Forbidden` response.

---

## 2. Protected Admin Routes & API Schema

### Protected Frontend Admin Routes
- `/admin`: Overview Dashboard (analytics, quick status toggles, review logs)
- `/admin/projects`: Project catalogue, case study drafts, architecture node editor
- `/admin/experience`: Work history entries, employment type, STAR bullet metrics, tech stacks
- `/admin/skills`: 8-category skill matrix, proficiency levels (`Core`, `Proficient`, `Familiar`), official docs links
- `/admin/achievements`: Distinctions, credential verification URLs, hackathons, open-source PRs
- `/admin/about`: Professional narrative, five-pillar engineering philosophies, current research focus, and career direction
- `/admin/resume`: Resume metadata (version, updated date, summary), PDF file replacement upload
- `/admin/contact`: Contact info channels, availability status, recruiter response SLAs
- `/admin/messages`: Private recruiter inbox (view messages, mark read/unread, archive, delete)

All `/admin/*` routes are protected by server middleware. Unauthenticated requests are immediately bounced to `/admin/login`.

---

### Protected REST Endpoints

#### A. Experience API Endpoints (`/api/admin/experience`)

| Method | Endpoint | Description | Authorization |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/experience` | Fetch all experience records (including drafts) | Owner-Only (`401/403`) |
| `POST` | `/api/admin/experience` | Create a new work experience record | Owner-Only (`401/403`) |
| `GET` | `/api/admin/experience/:id` | Fetch single experience details for editing | Owner-Only (`401/403`) |
| `PUT` | `/api/admin/experience/:id` | Update organization, role, STAR bullets, stack | Owner-Only (`401/403`) |
| `DELETE` | `/api/admin/experience/:id` | Permanently delete an experience entry | Owner-Only (`401/403`) |
| `PUT` | `/api/admin/experience/:id/featured` | Toggle `featured` flag on homepage preview | Owner-Only (`401/403`) |
| `POST` | `/api/admin/experience/reorder` | Update chronological display ordering | Owner-Only (`401/403`) |

---

#### B. Skills API Endpoints (`/api/admin/skills`)

| Method | Endpoint | Description | Authorization |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/skills` | List all skills categorized into 8 domains | Owner-Only (`401/403`) |
| `POST` | `/api/admin/skills` | Add new technology item | Owner-Only (`401/403`) |
| `PUT` | `/api/admin/skills/:id` | Update proficiency level, category, official URL | Owner-Only (`401/403`) |
| `DELETE` | `/api/admin/skills/:id` | Remove a technology item | Owner-Only (`401/403`) |
| `PUT` | `/api/admin/skills/:id/featured` | Toggle featured status for homepage chips | Owner-Only (`401/403`) |

---

#### C. Achievements API Endpoints (`/api/admin/achievements`)

| Method | Endpoint | Description | Authorization |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/achievements` | List all verified achievements and honors | Owner-Only (`401/403`) |
| `POST` | `/api/admin/achievements` | Create a new achievement entry | Owner-Only (`401/403`) |
| `PUT` | `/api/admin/achievements/:id` | Update title, organization, credential URL | Owner-Only (`401/403`) |
| `DELETE` | `/api/admin/achievements/:id` | Delete an achievement entry | Owner-Only (`401/403`) |
| `PUT` | `/api/admin/achievements/:id/featured` | Toggle highlight status on homepage | Owner-Only (`401/403`) |
| `POST` | `/api/admin/achievements/reorder` | Update ordering sequence | Owner-Only (`401/403`) |

---

#### D. About API Endpoints (`/api/admin/about`)

| Method | Endpoint | Description | Authorization |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/about` | Fetch about narrative, philosophies, current focus | Owner-Only (`401/403`) |
| `PUT` | `/api/admin/about` | Update story paragraphs, five-pillar philosophies | Owner-Only (`401/403`) |
| `PUT` | `/api/admin/about/focus` | Update current technical research focus | Owner-Only (`401/403`) |
| `PUT` | `/api/admin/about/career` | Update career direction & opportunities statement | Owner-Only (`401/403`) |
| `PUT` | `/api/admin/about/quickfacts` | Update quick facts key-value matrix | Owner-Only (`401/403`) |

---

#### E. Resume API Endpoints (`/api/admin/resume`)

| Method | Endpoint | Description | Authorization |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/resume` | Fetch resume metadata and download analytics | Owner-Only (`401/403`) |
| `PUT` | `/api/admin/resume` | Update resume version, update date, summary | Owner-Only (`401/403`) |
| `POST` | `/api/admin/resume/upload` | Upload new PDF version (replaces asset cleanly) | Owner-Only (`401/403`) |

---

#### F. Contact & Private Messages API Endpoints (`/api/admin/messages`)

| Method | Endpoint | Description | Authorization |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/contact` | **Public** submission endpoint (Rate-limited, Honeypot) | Public (Write-Only) |
| `GET` | `/api/admin/messages` | List received recruiter inquiries with pagination | Owner-Only (`401/403`) |
| `GET` | `/api/admin/messages/:id` | View full message text & sender metadata | Owner-Only (`401/403`) |
| `PUT` | `/api/admin/messages/:id/read` | Toggle read/unread flag | Owner-Only (`401/403`) |
| `PUT` | `/api/admin/messages/:id/archive` | Move inquiry to archived mailbox | Owner-Only (`401/403`) |
| `DELETE` | `/api/admin/messages/:id` | Permanently delete inquiry | Owner-Only (`401/403`) |

#### Contact Message Schema
```json
{
  "id": "msg-1727003450000",
  "name": "Sarah Jenkins",
  "email": "sarah@techcompany.com",
  "subject": "Fall 2026 SWE Internship",
  "message": "Hi Alex, our distributed storage team has an opening for Fall 2026. We'd love to chat!",
  "createdAt": "2026-09-22T08:30:50.000Z",
  "read": false,
  "archived": false,
  "senderIpHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

---

## 3. Server-Side Authentication & Authorization Middleware

```typescript
// server/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifySessionToken } from '../lib/session';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: 'OWNER';
  };
}

export async function requireOwnerAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionToken = req.cookies['__Secure-admin-session'];

  if (!sessionToken) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Access denied: Authentication session missing.'
    });
    return;
  }

  try {
    const verifiedUser = await verifySessionToken(sessionToken);

    // Strict role check: Must be designated portfolio owner
    if (!verifiedUser || verifiedUser.role !== 'OWNER') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: Owner privileges required.'
      });
      return;
    }

    req.user = verifiedUser;
    next();
  } catch (err) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Access denied: Invalid or expired session.'
    });
  }
}
```

---

## 4. Defense-in-Depth Safeguards

1. **Session Cookies**:
   - `HttpOnly`: Inaccessible via clientside `document.cookie` (mitigates XSS exfiltration).
   - `Secure`: Transmitted only over TLS/HTTPS.
   - `SameSite=Strict`: Prevents Cross-Site Request Forgery (CSRF).
2. **Public Contact Rate Limiting**:
   - Public message submission (`POST /api/contact`) enforces strict sliding window rate limits: max 5 requests per 15 minutes per IP.
   - Honeypot hidden field (`website_hp`) immediately drops bot submissions without triggering database writes.
3. **MIME-Type & Magic Byte File Verification**:
   - Asset uploads (`/api/admin/resume/upload`, `/api/admin/upload`) validate magic bytes (PDF: `%PDF-`, Images: JPEG, PNG, WebP) and restrict file size (max 5MB). Script execution inside upload directories is disabled via `X-Content-Type-Options: nosniff`.
4. **Input Sanitization & Schema Validation**:
   - All text inputs are validated against strict Zod/TypeScript schemas before persistence.
   - Markdown content is sanitized server-side (using `DOMPurify` / `sanitize-html`) to prevent stored XSS attacks.
5. **Audit Logging**:
   - Every mutation (create, edit, delete, reorder) writes a structured JSON log entry containing timestamp, client IP, action, target entity type, and ID.
