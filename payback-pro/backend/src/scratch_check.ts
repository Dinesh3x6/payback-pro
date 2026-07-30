import { prisma } from "./prisma/client";

async function main() {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 10
  });
  console.log("=== PAYMENTS ===");
  for (const p of payments) {
    console.log(`ID: ${p.id}, OrderID: ${p.razorpayOrderId}, Amount: ${p.amount}, Status: ${p.status}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
