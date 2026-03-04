import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildMonthlyReportData, generateMonthlyReportPdf } from "@/lib/monthlyReportPdf";
import { toast } from "@/hooks/use-toast";

export default function ExportLaporan() {
  const [exportMonthYear, setExportMonthYear] = useState(() => format(new Date(), "yyyy-MM"));
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

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

  const handlePreviewPdf = () => {
    if (!transactions?.length) {
      toast({ title: "Tidak ada data transaksi", variant: "destructive" });
      return;
    }
    setGeneratingPdf(true);
    try {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      const reportData = buildMonthlyReportData(transactions, exportMonthYear);
      const blob = generateMonthlyReportPdf(reportData);
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
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

  const handleDownloadPdf = () => {
    if (!pdfBlobUrl) return;
    const a = document.createElement("a");
    a.href = pdfBlobUrl;
    a.download = `Laporan-Bulanan-${exportMonthYear}.pdf`;
    a.click();
  };

  const handlePilihBulanLain = () => {
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    setPdfBlobUrl(null);
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
            Ekspor laporan bulanan restoran dalam bentuk PDF dan preview sebelum unduh.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Laporan Bulanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!pdfBlobUrl ? (
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
                  onClick={handlePreviewPdf}
                  disabled={generatingPdf || !transactions?.length}
                  className="gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  {generatingPdf ? "Membuat PDF..." : "Preview PDF"}
                </Button>
              </>
            ) : (
              <>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={handleDownloadPdf} className="gap-2">
                    <FileDown className="h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button variant="outline" onClick={handlePilihBulanLain}>
                    Pilih bulan lain
                  </Button>
                </div>
                <div className="min-h-[400px] border rounded-lg overflow-hidden bg-muted/30">
                  <iframe
                    title="Preview Laporan PDF"
                    src={pdfBlobUrl}
                    className="w-full min-h-[500px] border-0"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
