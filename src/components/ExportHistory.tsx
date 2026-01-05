import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2 } from "lucide-react";

interface ExportHistoryProps {
  userId: string;
  type: "search" | "orders";
}

export const ExportHistory = ({ userId, type }: ExportHistoryProps) => {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const exportToCSV = async () => {
    setExporting(true);
    try {
      let csvContent = "";
      let filename = "";

      if (type === "search") {
        const { data, error } = await supabase
          .from('search_history')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) throw error;

        if (!data || data.length === 0) {
          toast({
            title: "No Data",
            description: "No search history to export.",
            variant: "destructive",
          });
          setExporting(false);
          return;
        }

        // CSV header
        csvContent = "Phone Number,Name,Address,Circle,Date\n";

        // CSV rows
        data.forEach((item) => {
          const row = [
            `"${item.phone_number || ''}"`,
            `"${(item.name || '').replace(/"/g, '""')}"`,
            `"${(item.address || '').replace(/"/g, '""')}"`,
            `"${(item.circle || '').replace(/"/g, '""')}"`,
            `"${new Date(item.created_at).toLocaleString()}"`,
          ].join(",");
          csvContent += row + "\n";
        });

        filename = `search-history-${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) throw error;

        if (!data || data.length === 0) {
          toast({
            title: "No Data",
            description: "No order history to export.",
            variant: "destructive",
          });
          setExporting(false);
          return;
        }

        // CSV header
        csvContent = "Order ID,Credits,Amount,Status,Date\n";

        // CSV rows
        data.forEach((item) => {
          const row = [
            `"${item.order_id}"`,
            item.credits,
            item.amount,
            `"${item.status}"`,
            `"${new Date(item.created_at).toLocaleString()}"`,
          ].join(",");
          csvContent += row + "\n";
        });

        filename = `order-history-${new Date().toISOString().split('T')[0]}.csv`;
      }

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `${type === "search" ? "Search" : "Order"} history exported successfully.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportToCSV}
      disabled={exporting}
    >
      {exporting ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      Export CSV
    </Button>
  );
};
