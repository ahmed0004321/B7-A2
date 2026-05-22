# DevPulse — Internal Tech Issue & Feature Tracker

A collaborative REST API for software teams to report bugs, suggest features, and coordinate resolutions. Built with Node.js, TypeScript, Express.js, and PostgreSQL.

**Live URL:** `https://your-deployment-url.vercel.app`
**GitHub:** `https://github.com/ahmed0004321/B7-A2`

---

## Features

- JWT-based authentication (register & login)
- Role-based access control — `contributor` and `maintainer` roles
- Full issues CRUD — create, read, update, delete
- Issue filtering by `type` and `status`, sorting by `newest` / `oldest`
- Reporter details embedded in issue responses (no SQL JOINs)
- Raw SQL with PostgreSQL connection pooling — no ORM

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js (LTS) | Runtime |
| TypeScript 5.x | Type safety |
| Express.js | HTTP server & routing |
| PostgreSQL | Relational database |
| pg (node-postgres) | Native DB driver, raw `pool.query()` calls |
| bcrypt | Password hashing (salt rounds: 10) |
| jsonwebtoken | JWT generation & verification |
| dotenv | Environment variable loading |
| http-status-codes | Consistent HTTP status code references |

---

## Project Structure

```
src/
├── server.ts               # Entry point — starts HTTP server
├── app.ts                  # Express app setup — registers all routes
├── config/
│   └── env.ts              # Loads and exports environment variables
├── DB/
│   └── index.ts            # PostgreSQL pool + table initialization (initDB)
├── middleware/
│   └── auth.ts             # JWT verification + role-based guard middleware
├── types/
│   ├── index.ts            # Shared constants (USER_ROLE) and types (ROLES)
│   └── express.d.ts        # Extends Express Request to include req.user
└── module/
    ├── auth/
    │   ├── auth.route.ts       # POST /api/auth/login
    │   ├── auth.controller.ts  # Handles request/response for login
    │   └── auth.service.ts     # Business logic — verify credentials, sign JWT
    ├── user/
    │   ├── user.route.ts       # POST /api/auth/signup
    │   ├── user.controller.ts  # Handles request/response for signup
    │   ├── user.service.ts     # Business logic — hash password, insert user
    │   └── user.interface.ts   # TypeScript interface for user shape
    └── issues/
        ├── issues.route.ts       # All /api/issues routes
        ├── issues.controller.ts  # Handles request/response for all issue ops
        ├── issues.service.ts     # Business logic — all DB queries for issues
        └── issues.interface.ts   # TypeScript interface for issue shape
```

---

## Module Pattern

Each feature lives in its own folder under `src/module/` and is split into three layers: **route → controller → service**. This is a deliberate separation of concerns.

```
Request
   │
   ▼
Route       — Defines the endpoint path, HTTP method, and which middleware
              to apply (e.g. auth guard). Knows nothing about business logic.
   │
   ▼
Controller  — Reads from req (body, params, query, user). Calls the service.
              Sends the final res with the correct status code. Has no SQL.
   │
   ▼
Service     — Pure business logic. Talks to the database via pool.query().
              Returns data or throws errors. Has no req or res objects.
   │
   ▼
Database    — PostgreSQL via the shared pool from src/DB/index.ts
```

**Why this matters:**
- The service can be reused or tested independently because it has no HTTP dependency.
- The controller stays thin — it just translates HTTP in/out.
- The route is purely declarative — it reads like a table of contents for the API.

---

## Request Flow — Detailed Walkthrough

### Example: `PATCH /api/issues/:id` (Update Issue)

```
Client sends PATCH /api/issues/45
  with Authorization: <JWT_TOKEN> header
  and body: { "title": "...", "description": "...", "type": "bug" }
```

**Step 1 — app.ts**
Express receives the request and matches it to `issuesRoute` mounted at `/api/issues`.

**Step 2 — issues.route.ts**
```typescript
router.patch('/:id', auth(USER_ROLE.contributor, USER_ROLE.maintainer), issueController.updateIssue);
```
Two things happen here before the controller runs:
1. The `auth` middleware is called with the allowed roles.
2. If auth passes, `issueController.updateIssue` runs.

**Step 3 — middleware/auth.ts**
```
Token extracted from req.headers.authorization
  → jwt.verify() checks signature and expiry
  → Decoded payload (id, name, email, role) used to query the DB
  → User record fetched and confirmed to exist
  → Role checked against allowed roles passed in
  → req.user = { id, name, email, role } set for downstream use
  → next() called → moves to controller
```
If any check fails, a `401` or `403` response is sent immediately and the controller never runs.

**Step 4 — issues.controller.ts**
```typescript
const id = req.params.id;         // issue ID from URL
const user = req.user;            // set by auth middleware

// Fetch the issue first to check ownership
const issueResult = await pool.query(`SELECT * FROM issues WHERE id = $1`, [id]);

// canUpdateIssue() checks:
//   - maintainer → always allowed
//   - contributor → only if issue.reporter_id === user.id AND issue.status === 'open'
if (!canUpdateIssue(issue, user)) return res.status(403).json(...);

// Delegate to service
const result = await issueService.updateIssueFromDB(id, req.body, user);

res.status(200).json({ success: true, message: "Issue updated successfully", data: result });
```

**Step 5 — issues.service.ts**
```typescript
// Maintainer can update status; contributor cannot
const newStatus = user.role === USER_ROLE.maintainer ? status : undefined;

await pool.query(`
  UPDATE issues
  SET title = COALESCE($1, title),
      description = COALESCE($2, description),
      type = COALESCE($3, type),
      status = COALESCE($4, status),
      updated_at = NOW()
  WHERE id = $5
  RETURNING *
`, [title, description, type, newStatus, id]);
```
`COALESCE` means any field not provided in the request body stays unchanged — only sent fields are updated.

**Step 6 — Response travels back up** through service → controller → Express → client.

---

## Authentication Flow

```
POST /api/auth/login
  { email, password }
       │
       ▼
  auth.service.ts
  1. Query DB for user by email
  2. bcrypt.compare(plainPassword, hashedPassword)
  3. jwt.sign({ id, name, email, role }, SECRET, { expiresIn: "10d" })
  4. Return { token, user } (password field deleted before returning)
       │
       ▼
  Client stores the token and sends it in every protected request:
  Authorization: <token>
       │
       ▼
  middleware/auth.ts intercepts and verifies on each protected route
```

The JWT payload contains `id`, `name`, `email`, and `role`. This means protected routes never need to re-query the user for basic identity — it is already in `req.user` after the middleware runs.

---

## Reporter Details Without SQL JOINs

The spec explicitly forbids SQL JOINs. To still include reporter info in issue responses, a two-step query pattern is used in `issues.service.ts`:

```typescript
// Step 1: fetch all issues
const issues = await pool.query(`SELECT * FROM issues WHERE 1=1 ...`);

// Step 2: for each issue, fetch its reporter separately
for (const issue of issues.rows) {
  const reporter = await pool.query(
    `SELECT id, name, role FROM users WHERE id = $1`,
    [issue.reporter_id]
  );
  result.push({ ...issue, reporter: reporter.rows[0] });
}
```

For `GET /api/issues/:id` (single issue) the same pattern runs once instead of in a loop.

---

## Database Schema

### users

```sql
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL,
  email       VARCHAR(50) NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  role        VARCHAR(40) DEFAULT 'contributor'
                CHECK (role IN ('contributor', 'maintainer')),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);
```

### issues

```sql
CREATE TABLE IF NOT EXISTS issues (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(150) NOT NULL,
  description  TEXT NOT NULL CHECK (LENGTH(description) >= 20),
  type         VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'feature_request')),
  status       VARCHAR(20) NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'in_progress', 'resolved')),
  reporter_id  INT NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);
```

Tables are auto-created on server startup via `initDB()` in `src/DB/index.ts`.

---

## API Endpoints

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and receive JWT |

### Issues

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/issues` | Authenticated | Create a new issue |
| GET | `/api/issues` | Public | Get all issues (with filters) |
| GET | `/api/issues/:id` | Public | Get a single issue |
| PATCH | `/api/issues/:id` | Authenticated | Update an issue |
| DELETE | `/api/issues/:id` | Maintainer only | Delete an issue |

### Query Parameters for `GET /api/issues`

| Param | Values | Default |
|---|---|---|
| `sort` | `newest`, `oldest` | `newest` |
| `type` | `bug`, `feature_request` | — |
| `status` | `open`, `in_progress`, `resolved` | — |

---

## Role Permissions

| Action | contributor | maintainer |
|---|---|---|
| Register / Login | ✅ | ✅ |
| Create issue | ✅ | ✅ |
| View all issues | ✅ | ✅ |
| Update own issue (status: open only) | ✅ | ✅ |
| Update any issue + change status | ❌ | ✅ |
| Delete any issue | ❌ | ✅ |

---

## Local Setup

### Prerequisites

- Node.js LTS (v20+)
- PostgreSQL database (local or cloud — NeonDB / Supabase)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/ahmed0004321/B7-A2.git
cd B7-A2

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Fill in your values (see Environment Variables below)

# 4. Start dev server
npm run dev
```

The server will start and automatically create the `users` and `issues` tables if they don't exist.

### Environment Variables

Create a `.env` file in the root:

```env
PORT=5000
CONNECTION_STRING=postgresql://user:password@host:5432/dbname
ACCESS_TOKEN=your_jwt_secret_key
```

---

## Example Requests

### Register

```bash
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@devpulse.com",
  "password": "securePassword123",
  "role": "contributor"
}
```

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@devpulse.com",
  "password": "securePassword123"
}
```

### Create Issue

```bash
POST /api/issues
Authorization: <your_jwt_token>
Content-Type: application/json

{
  "title": "Database connection timeout under load",
  "description": "Pool exhausts after 50+ concurrent queries, causing 500 errors",
  "type": "bug"
}
```

### Get Issues with Filters

```bash
GET /api/issues?sort=newest&type=bug&status=open
```