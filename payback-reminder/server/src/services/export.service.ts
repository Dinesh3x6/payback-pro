import { Parser as CsvParser } from "json2csv";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { prisma } from "@/config/prisma";

async function fetchExportRows(userId: string) {
  const borrowers = await prisma.borrower.findMany({
    where: { userId },
    orderBy: { dueDate: "asc" },
    include: { payments: true },
  });

  return borrowers.map((b) => ({
    name: b.name,
    email: b.email ?? "",
    phone: b.phone ?? "",
    amount: Number(b.amount),
    remainingAmount: Number(b.remainingAmount),
    status: b.status,
    borrowDate: b.borrowDate.toISOString().slice(0, 10),
    dueDate: b.dueDate.toISOString().slice(0, 10),
    paymentsCount: b.payments.length,
    notes: b.notes ?? "",
  }));
}

export async function exportBorrowersCsv(userId: string): Promise<string> {
  const rows = await fetchExportRows(userId);
  const parser = new CsvParser({
    fields: [
      "name",
      "email",
      "phone",
      "amount",
      "remainingAmount",
      "status",
      "borrowDate",
      "dueDate",
      "paymentsCount",
      "notes",
    ],
  });
  return parser.parse(rows);
}

export async function exportBorrowersPdf(userId: string): Promise<Buffer> {
  const rows = await fetchExportRows(userId);
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  doc.pipe(stream);
  stream.on("data", (chunk) => chunks.push(chunk));

  doc.fontSize(18).text("PayBack Reminder — Borrower Report", { align: "center" });
  doc.moveDown();
  doc.fontSize(10).fillColor("#6b7280").text(`Generated on ${new Date().toLocaleDateString("en-IN")}`, {
    align: "center",
  });
  doc.moveDown(1.5);

  const colWidths = [110, 60, 60, 70, 60, 65];
  const headers = ["Name", "Amount", "Remaining", "Status", "Borrowed", "Due"];
  let y = doc.y;

  doc.fontSize(10).fillColor("#111827");
  headers.forEach((h, i) => {
    doc.text(h, 40 + sum(colWidths.slice(0, i)), y, { width: colWidths[i], continued: false });
  });
  y += 18;
  doc.moveTo(40, y - 4).lineTo(555, y - 4).strokeColor("#e5e7eb").stroke();

  doc.fontSize(9).fillColor("#374151");
  for (const row of rows) {
    if (y > 760) {
      doc.addPage();
      y = 40;
    }
    const cells = [
      row.name,
      `Rs.${row.amount.toFixed(0)}`,
      `Rs.${row.remainingAmount.toFixed(0)}`,
      row.status,
      row.borrowDate,
      row.dueDate,
    ];
    cells.forEach((c, i) => {
      doc.text(String(c), 40 + sum(colWidths.slice(0, i)), y, { width: colWidths[i] });
    });
    y += 18;
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}
