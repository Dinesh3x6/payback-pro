# PayBack Pro — Foundation + Reminder/Notification System

This is Phase 1 of the full spec: a minimal but real foundation (auth, borrowers,
loans) plus a fully working **multi-channel reminder system**. Email, WhatsApp,
and SMS actually send messages once you add your own credentials. The other 8
channels (Telegram, Push, Desktop, In-App, Discord, Slack, Teams, QR) are wired
end-to-end — checkbox → API → database log — but return a clear "not activated"
result until you drop in their API call. See "Extending a stub channel" below.

Everything runs on your machine only. No cloud services required except the
optional email/SMS/WhatsApp providers you configure.

```
Frontend  → http://localhost:3000   (Next.js)
Backend   → http://localhost:5000   (Express API)
Database  → local PostgreSQL
```

## 1. Prerequisites

- Node.js 18+ and npm
- PostgreSQL running locally (or via Docker)

## 2. Database setup

Create a local database:

```bash
psql -U postgres -c "CREATE DATABASE payback_pro;"
```

(Or with Docker: `docker run --name payback-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16`)

## 3. Backend setup

```bash
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL, JWT_SECRET, and (optionally) SMTP_*/TWILIO_* below

npm install
npx prisma migrate dev --name init   # creates all tables
npm run dev                          # starts http://localhost:5000
```

### Enabling Email (live)

Gmail SMTP works out of the box with an **App Password** (not your normal
Gmail password): https://myaccount.google.com/apppasswords

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=you@gmail.com
SMTP_PASS=your_16_char_app_password
SMTP_FROM="PayBack Pro <you@gmail.com>"
```

### Enabling WhatsApp + SMS (live, via Twilio)

Sign up for a free Twilio trial: https://www.twilio.com/try-twilio

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   # Twilio's sandbox number
TWILIO_SMS_FROM=+1XXXXXXXXXX                 # a Twilio phone number with SMS capability
```

Twilio WhatsApp sandbox note: in trial mode, each recipient phone number must
first send the sandbox's join code (e.g. "join happy-tiger") to the sandbox
number on WhatsApp before you can message them.

If you don't configure these, the app still runs fine — those channels will
just return a "not configured" status in the reminder history instead of a
crash.

## 4. Frontend setup

```bash
cd frontend
cp .env.local.example .env.local   # points at http://localhost:5000/api
npm install
npm run dev                        # starts http://localhost:3000
```

Open http://localhost:3000, register an account, add a borrower, add a loan,
then use "Send Reminder Now" and tick Email/WhatsApp/SMS to actually send.

## 5. Project structure

```
backend/
  prisma/schema.prisma        full data model (all 14 tables from the spec)
  src/
    modules/
      auth/                   register, login, forgot/reset password, profile
      borrower/                CRUD + search
      loan/                    CRUD + repayments + balance calc
      reminder/                send now / schedule / recurring / pause / resume / cancel / history
      notifications/
        channels/              one file per channel (email, whatsapp, sms live; rest stubbed)
        notification.service.ts  the channel registry — fan-out + logging
    middleware/                 auth guard, Zod validation, centralized error handler
    utils/                      jwt, bcrypt, ApiError, asyncHandler

frontend/
  app/
    login/, register/          auth pages
    borrowers/                 list + add
    borrowers/[id]/            loan list, reminder sender (multi-channel), reminder history
  components/
    ChannelSelector.tsx        the 11-channel checkbox grid
    ui.tsx                     shared Button/Input/Card/Badge primitives
  lib/
    api.ts, auth.ts            axios client + JWT storage
```

## 6. Extending a stub channel (e.g. Telegram)

1. Get credentials (e.g. a bot token from @BotFather) and add them to `backend/.env`.
2. Open `backend/src/modules/notifications/channels/stub.channel.factory.ts` —
   each stub's comment tells you exactly what API call to make.
3. Create `telegram.channel.ts` following the same shape as `email.channel.ts`
   (implements the `NotificationChannel` interface: one `send(payload)` method).
4. In `notification.service.ts`, swap `telegramChannel` (the stub import) for
   your new implementation. Nothing else changes — the reminder engine, the
   frontend checkbox, and the history logging already work for every channel
   in the registry.

## 7. What's not built yet (from your original spec)

This phase deliberately focused on the reminder/notification engine. Not yet
implemented: Expense tracking UI, AI chat assistant, PDF/Excel/CSV reports,
Dashboard charts, Settings page (SMTP/Twilio config via UI instead of `.env`),
bulk actions, calendar view, OCR, UPI QR generation, and the remaining 8
notification channels' real API calls. The database schema and backend
architecture already account for all of these — most are a new
`module/` folder following the same controller/service/routes pattern used
by `borrower` and `loan`, so they slot in without restructuring anything.

Tell me which of these you want built next and I'll pick up from here.
