import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@payback.app" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@payback.app",
      passwordHash,
      upiId: "demo@okhdfcbank",
    },
  });

  const now = new Date();
  const inDays = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  await prisma.borrower.createMany({
    data: [
      {
        userId: user.id,
        name: "Arun Kumar",
        email: "arun@example.com",
        phone: "9876543210",
        amount: 5000,
        remainingAmount: 5000,
        borrowDate: inDays(-30),
        dueDate: inDays(-2), // overdue
        notes: "Lent for bike repair",
        status: "PENDING",
        reminderFrequency: "WEEKLY",
      },
      {
        userId: user.id,
        name: "Priya S",
        email: "priya@example.com",
        phone: "9876500000",
        amount: 10000,
        remainingAmount: 4000,
        borrowDate: inDays(-15),
        dueDate: inDays(10),
        notes: "Partially repaid via UPI",
        status: "PARTIALLY_PAID",
        reminderFrequency: "MONTHLY",
      },
      {
        userId: user.id,
        name: "Karthik R",
        email: "karthik@example.com",
        phone: "9123456789",
        amount: 2000,
        remainingAmount: 0,
        borrowDate: inDays(-40),
        dueDate: inDays(-10),
        notes: "Fully repaid",
        status: "PAID",
        reminderFrequency: "NONE",
        remindersActive: false,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete. Demo login: demo@payback.app / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
