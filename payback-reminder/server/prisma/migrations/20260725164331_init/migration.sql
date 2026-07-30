-- CreateEnum
CREATE TYPE "BorrowerStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID');

-- CreateEnum
CREATE TYPE "ReminderFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'NONE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'CASH', 'BANK_TRANSFER', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "authProvider" TEXT NOT NULL DEFAULT 'local',
    "externalId" TEXT,
    "upiId" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrowers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "remainingAmount" DECIMAL(12,2) NOT NULL,
    "borrowDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "BorrowerStatus" NOT NULL DEFAULT 'PENDING',
    "reminderFrequency" "ReminderFrequency" NOT NULL DEFAULT 'WEEKLY',
    "remindersActive" BOOLEAN NOT NULL DEFAULT true,
    "lastReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "borrowers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'UPI',
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_logs" (
    "id" TEXT NOT NULL,
    "borrowerId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMsg" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_externalId_key" ON "users"("externalId");

-- CreateIndex
CREATE INDEX "borrowers_userId_idx" ON "borrowers"("userId");

-- CreateIndex
CREATE INDEX "borrowers_status_idx" ON "borrowers"("status");

-- CreateIndex
CREATE INDEX "borrowers_dueDate_idx" ON "borrowers"("dueDate");

-- CreateIndex
CREATE INDEX "payments_borrowerId_idx" ON "payments"("borrowerId");

-- CreateIndex
CREATE INDEX "reminder_logs_borrowerId_idx" ON "reminder_logs"("borrowerId");

-- AddForeignKey
ALTER TABLE "borrowers" ADD CONSTRAINT "borrowers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "borrowers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_logs" ADD CONSTRAINT "reminder_logs_borrowerId_fkey" FOREIGN KEY ("borrowerId") REFERENCES "borrowers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
