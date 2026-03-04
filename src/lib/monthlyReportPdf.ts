import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const paymentLabel: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer Bank",
  ewallet: "E-Wallet",
};

function formatRupiahPdf(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export interface TransactionForReport {
  id: string;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
}

export interface MonthlyReportData {
  monthYear: string; // "yyyy-MM"
  monthLabel: string; // "Maret 2025"
  transactions: TransactionForReport[];
  totalRevenue: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  byPayment: Record<string, { count: number; total: number }>;
}

export function buildMonthlyReportData(
  transactions: TransactionForReport[],
  monthYear: string
): MonthlyReportData {
  const [year, month] = monthYear.split("-").map(Number);
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;

  const filtered = transactions.filter((t) =>
    t.created_at.startsWith(monthPrefix)
  );

  const completed = filtered.filter((t) => t.status === "completed");
  const totalRevenue = completed.reduce((s, t) => s + t.total, 0);
  const byPayment: Record<string, { count: number; total: number }> = {};
  completed.forEach((t) => {
    const key = t.payment_method || "other";
    if (!byPayment[key]) byPayment[key] = { count: 0, total: 0 };
    byPayment[key].count += 1;
    byPayment[key].total += t.total;
  });

  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: idLocale });
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return {
    monthYear,
    monthLabel: monthLabelCap,
    transactions: filtered.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    totalRevenue,
    completedCount: completed.length,
    pendingCount: filtered.filter((t) => t.status === "pending").length,
    failedCount: filtered.filter((t) => t.status === "failed").length,
    byPayment,
  };
}

export function generateMonthlyReportPdf(data: MonthlyReportData): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.getPageWidth();
  const margin = 16;
  let y = 20;
  const lineH = 7;
  const fontTitle = 16;
  const fontSub = 12;
  const fontNorm = 10;

  doc.setFontSize(fontTitle);
  doc.setFont("helvetica", "bold");
  doc.text("Laporan Bulanan Restoran", margin, y);
  y += lineH + 2;

  doc.setFontSize(fontSub);
  doc.setFont("helvetica", "normal");
  doc.text("Mandalika POS", margin, y);
  y += lineH;

  doc.setFont("helvetica", "bold");
  doc.text(data.monthLabel, margin, y);
  y += lineH + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontNorm);
  doc.text(`Total transaksi selesai: ${data.completedCount}`, margin, y);
  y += lineH;
  doc.text(`Total transaksi pending: ${data.pendingCount}`, margin, y);
  y += lineH;
  doc.text(`Total transaksi gagal: ${data.failedCount}`, margin, y);
  y += lineH;
  doc.text(`Total pendapatan: ${formatRupiahPdf(data.totalRevenue)}`, margin, y);
  y += lineH + 4;

  if (Object.keys(data.byPayment).length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Per metode pembayaran:", margin, y);
    y += lineH;
    doc.setFont("helvetica", "normal");
    Object.entries(data.byPayment).forEach(([key, v]) => {
      doc.text(
        `  ${paymentLabel[key] || key}: ${v.count} transaksi - ${formatRupiahPdf(v.total)}`,
        margin,
        y
      );
      y += lineH;
    });
    y += 4;
  }

  if (data.transactions.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Daftar transaksi:", margin, y);
    y += lineH + 2;

    const colWidths = [38, 42, 35, 40, 35];
    const headers = ["Tanggal", "Waktu", "Total", "Metode", "Status"];
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    let x = margin;
    headers.forEach((h, i) => {
      doc.text(h, x, y);
      x += colWidths[i];
    });
    y += lineH;
    doc.setFont("helvetica", "normal");

    data.transactions.slice(0, 25).forEach((tx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const d = new Date(tx.created_at);
      const dateStr = format(d, "dd/MM/yyyy", { locale: idLocale });
      const timeStr = format(d, "HH:mm", { locale: idLocale });
      x = margin;
      doc.text(dateStr, x, y);
      x += colWidths[0];
      doc.text(timeStr, x, y);
      x += colWidths[1];
      doc.text(formatRupiahPdf(tx.total), x, y);
      x += colWidths[2];
      doc.text(paymentLabel[tx.payment_method] ?? tx.payment_method, x, y);
      x += colWidths[3];
      doc.text(tx.status, x, y);
      y += lineH;
    });

    if (data.transactions.length > 25) {
      y += 4;
      doc.setFont("helvetica", "italic");
      doc.text(`... dan ${data.transactions.length - 25} transaksi lainnya.`, margin, y);
    }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Dibuat pada ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: idLocale })}`,
    margin,
    doc.getPageHeight() - 12
  );

  return doc.output("blob");
}
