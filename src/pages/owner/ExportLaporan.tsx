import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileDown, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildMonthlyReportData, generateMonthlyReportPdf, type MonthlyReportData } from "@/lib/monthlyReportPdf";
import { formatRupiah } from "@/lib/formatCurrency";
import { toast } from "@/hooks/use-toast";

const paymentLabel: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer Bank",
  ewallet: "E-Wallet",
};

function ReportPreviewHtml({
  data,
  className = "",
}: {
  data: MonthlyReportData;
  className?: string;
}) {
  return (
    <div className={`report-preview bg-white text-gray-900 rounded-lg border border-border shadow-sm overflow-hidden print:shadow-none print:border-0 min-w-max ${className}`}>
      <div className="p-6 sm:p-8">
        <h2 className="text-xl font-bold tracking-tight border-b-2 border-primary/30 pb-2">
          Laporan Bulanan Restoran
        </h2>
        <p className="text-sm text-gray-600 mt-1">Mandalika POS</p>
        <p className="text-lg font-semibold mt-3">{data.monthLabel}</p>

        <div className="mt-6 space-y-2 text-sm">
          <p><span className="font-medium">Total transaksi selesai:</span> {data.completedCount}</p>
          <p><span className="font-medium">Total transaksi pending:</span> {data.pendingCount}</p>
          <p><span className="font-medium">Total transaksi gagal:</span> {data.failedCount}</p>
          <p><span className="font-medium">Total pendapatan:</span>{" "}
            <span className="font-semibold text-primary">{formatRupiah(data.totalRevenue)}</span>
          </p>
        </div>

        {Object.keys(data.byPayment).length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2">
              Per metode pembayaran
            </h3>
            <ul className="space-y-1.5 text-sm">
              {Object.entries(data.byPayment).map(([key, v]) => (
                <li key={key} className="flex flex-wrap gap-x-2">
                  <span>{paymentLabel[key] || key}:</span>
                  <span>{v.count} transaksi</span>
                  <span className="font-medium">— {formatRupiah(v.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.transactions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-3">
              Daftar transaksi
            </h3>
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="px-3 py-2.5 font-semibold border-b border-gray-200">Tanggal</th>
                    <th className="px-3 py-2.5 font-semibold border-b border-gray-200">Waktu</th>
                    <th className="px-3 py-2.5 font-semibold border-b border-gray-200">Total</th>
                    <th className="px-3 py-2.5 font-semibold border-b border-gray-200">Metode</th>
                    <th className="px-3 py-2.5 font-semibold border-b border-gray-200">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.slice(0, 50).map((tx) => {
                    const d = new Date(tx.created_at);
                    return (
                      <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-3 py-2">{format(d, "dd/MM/yyyy", { locale: idLocale })}</td>
                        <td className="px-3 py-2">{format(d, "HH:mm", { locale: idLocale })}</td>
                        <td className="px-3 py-2 font-medium">{formatRupiah(tx.total)}</td>
                        <td className="px-3 py-2">{paymentLabel[tx.payment_method] ?? tx.payment_method}</td>
                        <td className="px-3 py-2">{tx.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {data.transactions.length > 50 && (
                <p className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
                  ... dan {data.transactions.length - 50} transaksi lainnya.
                </p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ExportLaporan() {
  const [exportMonthYear, setExportMonthYear] = useState(() => format(new Date(), "yyyy-MM"));
  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [fullScreenOpen, setFullScreenOpen] = useState(false);
  const [fitScale, setFitScale] = useState(1);
  const fullScreenContainerRef = useRef<HTMLDivElement>(null);
  const fullScreenContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fullScreenOpen || !reportData) return;
    const updateScale = () => {
      const container = fullScreenContainerRef.current;
      const content = fullScreenContentRef.current;
      if (!container || !content) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const sw = content.scrollWidth;
      const sh = content.scrollHeight;
      if (sw <= 0 || sh <= 0) return;
      const scale = Math.min(cw / sw, ch / sh, 1);
      setFitScale(scale);
    };
    requestAnimationFrame(() => requestAnimationFrame(updateScale));
    const t = setTimeout(updateScale, 200);
    window.addEventListener("resize", updateScale);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", updateScale);
    };
  }, [fullScreenOpen, reportData]);

  const { data: transactions } = useQuery({
    queryKey: ["owner-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handlePreview = () => {
    if (!transactions?.length) {
      toast({ title: "Tidak ada data transaksi", variant: "destructive" });
      return;
    }
    const data = buildMonthlyReportData(transactions, exportMonthYear);
    setReportData(data);
  };

  const handleDownloadPdf = () => {
    if (!reportData) return;
    setGeneratingPdf(true);
    try {
      const blob = generateMonthlyReportPdf(reportData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan-Bulanan-${exportMonthYear}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "PDF berhasil diunduh" });
    } catch (err) {
      toast({
        title: "Gagal membuat PDF",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePilihBulanLain = () => {
    setReportData(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FileDown className="h-6 w-6" />
            Export Laporan Bulanan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preview laporan dalam HTML, lalu unduh dalam bentuk PDF.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Laporan Bulanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!reportData ? (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    Pilih bulan
                  </label>
                  <Input
                    type="month"
                    value={exportMonthYear}
                    onChange={(e) => setExportMonthYear(e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>
                <Button
                  onClick={handlePreview}
                  disabled={!transactions?.length}
                  className="gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  Preview
                </Button>
              </>
            ) : (
              <>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={handleDownloadPdf}
                    disabled={generatingPdf}
                    className="gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    {generatingPdf ? "Membuat PDF..." : "Download PDF"}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setFullScreenOpen(true)}
                  >
                    <Maximize2 className="h-4 w-4" />
                    Full screen
                  </Button>
                  <Button variant="outline" onClick={handlePilihBulanLain}>
                    Pilih bulan lain
                  </Button>
                </div>
                <div className="border rounded-lg overflow-auto max-h-[70vh] min-h-[280px] bg-muted/30 p-4 overscroll-contain touch-pan-x touch-pan-y [-webkit-overflow-scrolling:touch]">
                  <ReportPreviewHtml data={reportData} />
                </div>
                <Dialog open={fullScreenOpen} onOpenChange={setFullScreenOpen}>
                  <DialogContent className="fixed inset-0 z-50 w-[100vw] h-[100dvh] max-w-none translate-x-0 translate-y-0 rounded-none p-0 gap-0 overflow-hidden flex flex-col data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95">
                    <DialogHeader className="px-4 py-3 border-b shrink-0 bg-background">
                      <DialogTitle className="text-base">Preview Laporan — {reportData.monthLabel}</DialogTitle>
                    </DialogHeader>
                    <div
                      ref={fullScreenContainerRef}
                      className="flex-1 min-h-0 overflow-hidden flex items-center justify-center bg-muted/30 p-2"
                    >
                      <div
                        ref={fullScreenContentRef}
                        className="origin-center shrink-0"
                        style={{ transform: `scale(${fitScale})` }}
                      >
                        <ReportPreviewHtml data={reportData} />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
