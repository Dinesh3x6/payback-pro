# PayBack Reminder

Track money you've lent to friends and family, and let PayBack Reminder chase the repayments for you — with automatic email reminders, a UPI QR code carrying the exact amount due, and full support for partial payments.

```
paybackreminder/
├── client/     Next.js 14 (App Router) + TypeScript + Tailwind CSS frontend
├── server/     Node.js + Express + TypeScript + Prisma (PostgreSQL) API
└── README.md   You are here
```

---

## 1. Features

- **Auth** — email/password sign-up & login (JWT), or swap in Clerk/Firebase (see [§6](#6-swapping-in-clerk-or-firebase)).
- **Dashboard** — Total Lent, Total Pending, Total Recovered, Overdue amount, status breakdown chart.
- **Borrowers** — add / edit / delete, with name, email, phone, amount, borrow date, due date, notes.
- **Partial payments** — record any payment amount; remaining balance and status (`Pending` → `Partially paid` → `Paid`) update automatically.
- **UPI QR codes** — generated per-borrower for the exact remaining amount, using the standard `upi://pay` deep link (works with GPay, PhonePe, Paytm, BHIM).
- **Automatic reminder emails** — daily/weekly/monthly cron job emails borrowers with the amount due and their QR code attached; **reminders stop automatically once a borrower is marked `Paid`**.
- **Search & filter** — by name/email/phone, status, and overdue-only.
- **Payment history** — full timeline per borrower.
- **Export** — CSV and PDF of your full borrower ledger.
- **Responsive UI** with light/dark mode.

---

## 2. Tech stack

| Layer      | Choice                                                             |
|------------|---------------------------------------------------------------------|
| Frontend   | Next.js 14 (App Router), TypeScript, Tailwind CSS, React Hook Form  |
| Backend    | Node.js, Express, TypeScript                                        |
| Database   | PostgreSQL via Prisma ORM                                           |
| Auth       | Built-in JWT (default) — pluggable Clerk or Firebase                |
| Email      | Resend (default) or Nodemailer/SMTP                                 |
| QR codes   | `qrcode` npm package, UPI deep-link spec                             |
| Export     | `json2csv` (CSV), `pdfkit` (PDF)                                    |
| Scheduling | `node-cron`                                                          |

---

## 3. Prerequisites

- Node.js 18+
- A PostgreSQL database (local, or a free hosted instance from Neon/Supabase/Railway)
- An email provider account: [Resend](https://resend.com) (recommended, generous free tier) **or** SMTP credentials (e.g. a Gmail App Password)

---

## 4. Setup

### 4.1 Clone & install

```bash
cd paybackreminder
npm run install:all
# or manually:
#   cd server && npm install
#   cd client && npm install
```

### 4.2 Configure the backend

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/payback_reminder?schema=public"
JWT_SECRET="a-long-random-string"
CLIENT_URL="http://localhost:3000"

EMAIL_PROVIDER=resend
RESEND_API_KEY="re_xxx"
EMAIL_FROM="PayBack Reminder <reminders@yourdomain.com>"

REMINDER_CRON="0 9 * * *"   # every day at 9am
```

Run the database migration and (optionally) seed demo data:

```bash
npm run prisma:migrate     # creates tables from prisma/schema.prisma
npm run seed                # adds a demo user + 3 sample borrowers
```

Start the API:

```bash
npm run dev
# 🚀 PayBack Reminder API running on http://localhost:5000
```

### 4.3 Configure the frontend

```bash
cd ../client
cp .env.local.example .env.local
```

`client/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the app:

```bash
npm run dev
# ▲ Next.js running on http://localhost:3000
```

Visit `http://localhost:3000`, create an account (or sign in with the seeded demo user: `demo@payback.app` / `password123`), add your UPI ID under **Settings**, and start adding borrowers.

---

## 5. Project structure

### Backend (`/server`)

```
src/
├── config/          env.ts, prisma.ts — env loading & Prisma client singleton
├── middleware/       auth.middleware.ts, validate.middleware.ts, error.middleware.ts
├── routes/           auth.routes.ts, borrower.routes.ts, dashboard.routes.ts
├── controllers/      thin request handlers per route file
├── services/         auth, borrower, email, qrcode, export — all business logic
├── jobs/              reminder.job.ts — node-cron reminder sweep
├── utils/             schemas.ts (Zod), asyncHandler.ts
└── index.ts           Express app entrypoint
prisma/
├── schema.prisma      User, Borrower, Payment, ReminderLog models
└── seed.ts
```

### Frontend (`/client`)

```
app/
├── page.tsx                    Landing page
├── sign-in/, sign-up/          Auth pages
├── (app)/                      Authenticated route group (shared sidebar layout)
│   ├── dashboard/
│   ├── borrowers/               List + [id] detail page
│   └── settings/
components/                     Reusable UI: modals, table, forms, sidebar, navbar…
hooks/                           use-auth, use-borrowers, use-borrower, use-dashboard
lib/                             api.ts (Axios client), utils.ts (formatters)
types/                           Shared TypeScript interfaces
```

---

## 6. Swapping in Clerk or Firebase

The app ships with a working local JWT auth flow so it runs out of the box. To use **Clerk** or **Firebase** instead:

**Backend** (`server/src/middleware/auth.middleware.ts`):
1. Set `AUTH_PROVIDER=clerk` (or `firebase`) in `server/.env`.
2. Install the corresponding SDK (`@clerk/backend` or `firebase-admin`).
3. Fill in the marked extension points in `requireAuth()` — verify the incoming token and resolve/upsert the local `User` row via `externalId`.

**Frontend** (`client/hooks/use-auth.ts`):
1. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` in `client/.env.local` (this also activates `<ClerkProvider>` in `app/layout.tsx`).
2. Replace the body of `useAuth()` with Clerk's `useUser()` / `useAuth()` hooks (or Firebase's `onAuthStateChanged`), keeping the same `{ user, loading, login, signup, logout }` return shape so the rest of the app is untouched.
3. Update `lib/api.ts`'s request interceptor to attach the Clerk/Firebase session token instead of the `pbr_token` localStorage value.

---

## 7. REST API reference

All endpoints are prefixed with `/api` and (except `/auth/signup` and `/auth/login`) require `Authorization: Bearer <token>`.

| Method | Endpoint                        | Description                          |
|--------|----------------------------------|---------------------------------------|
| POST   | `/auth/signup`                  | Create account, returns JWT           |
| POST   | `/auth/login`                   | Log in, returns JWT                   |
| GET    | `/auth/me`                      | Current user profile                  |
| PATCH  | `/auth/me`                      | Update name / UPI ID / theme          |
| GET    | `/borrowers`                    | List borrowers (search/filter/paginate) |
| POST   | `/borrowers`                    | Create a borrower                     |
| GET    | `/borrowers/:id`                | Borrower detail + payment history     |
| PATCH  | `/borrowers/:id`                | Update a borrower                     |
| DELETE | `/borrowers/:id`                | Delete a borrower                     |
| POST   | `/borrowers/:id/payments`       | Record a (partial) payment            |
| GET    | `/borrowers/:id/qr`             | Generate a UPI QR code for the remaining balance |
| GET    | `/dashboard`                    | Aggregate stats (lent/pending/recovered/overdue) |
| GET    | `/dashboard/export/csv`         | Download all borrowers as CSV         |
| GET    | `/dashboard/export/pdf`         | Download all borrowers as PDF         |

Query params for `GET /borrowers`: `search`, `status` (`PENDING`/`PARTIALLY_PAID`/`PAID`), `overdue` (`true`), `sortBy` (`dueDate`/`amount`/`createdAt`/`name`), `sortOrder` (`asc`/`desc`), `page`, `pageSize`.

---

## 8. Production notes

- Run `npm run build` in both `server` and `client` before deploying; the server needs `npm run prisma:deploy` (not `migrate dev`) in production.
- Put the Express API behind HTTPS and set `CLIENT_URL` to your deployed frontend origin for CORS.
- Rotate `JWT_SECRET` and keep it out of source control.
- The reminder cron (`REMINDER_CRON`) runs inside the same Node process — for serverless deployments, move `runReminderSweep()` (in `src/jobs/reminder.job.ts`) into a scheduled function (e.g. a Vercel Cron Job or AWS EventBridge rule) instead of `node-cron`.
- All monetary values are stored as `Decimal(12,2)` in Postgres to avoid floating-point rounding errors.
