import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  CreditCard, 
  Download, 
  Loader2,
  Plus
} from "lucide-react";

interface BulkOperationsProps {
  onAuditLog: (action: string, targetUserId: string, targetUsername: string, details: object) => void;
  onRefresh: () => void;
}

export const BulkOperations = ({ onAuditLog, onRefresh }: BulkOperationsProps) => {
  const [usernames, setUsernames] = useState("");
  const [creditsToAdd, setCreditsToAdd] = useState("");
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleBulkAddCredits = async () => {
    const credits = parseInt(creditsToAdd);
    if (isNaN(credits) || credits <= 0 || credits > 10000) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid number of credits (1-10,000).",
        variant: "destructive",
      });
      return;
    }

    const usernameList = usernames
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (usernameList.length === 0) {
      toast({
        title: "No Users",
        description: "Please enter at least one username.",
        variant: "destructive",
      });
      return;
    }

    if (usernameList.length > 100) {
      toast({
        title: "Too Many Users",
        description: "Maximum 100 users per bulk operation.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    let successCount = 0;
    let failedUsers: string[] = [];

    try {
      for (const username of usernameList) {
        // Find user by username
        const { data: user, error: findError } = await supabase
          .from('users')
          .select('id, username, credits')
          .eq('username', username)
          .maybeSingle();

        if (findError || !user) {
          failedUsers.push(username);
          continue;
        }

        // Update credits
        const { error: updateError } = await supabase
          .from('users')
          .update({ credits: user.credits + credits })
          .eq('id', user.id);

        if (updateError) {
          failedUsers.push(username);
          continue;
        }

        onAuditLog('bulk_credits_added', user.id, user.username, { credits_added: credits });
        successCount++;
      }

      if (successCount > 0) {
        toast({
          title: "Credits Added",
          description: `Successfully added ${credits} credits to ${successCount} user(s).`,
        });
        onRefresh();
      }

      if (failedUsers.length > 0) {
        toast({
          title: "Some Users Not Found",
          description: `Could not find: ${failedUsers.join(', ')}`,
          variant: "destructive",
        });
      }

      setUsernames("");
      setCreditsToAdd("");
    } catch (error) {
      console.error("Bulk operation error:", error);
      toast({
        title: "Error",
        description: "Bulk operation failed",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const exportAllUsers = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "No Data",
          description: "No users to export.",
          variant: "destructive",
        });
        setExporting(false);
        return;
      }

      let csvContent = "Username,Credits,Banned,Created At,Updated At\n";
      
      data.forEach((user) => {
        const row = [
          `"${user.username}"`,
          user.credits,
          user.banned ? "Yes" : "No",
          `"${new Date(user.created_at).toLocaleString()}"`,
          `"${new Date(user.updated_at).toLocaleString()}"`,
        ].join(",");
        csvContent += row + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `all-users-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Exported ${data.length} users.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export users.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportAllOrders = async () => {
    setExporting(true);
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        toast({
          title: "No Data",
          description: "No orders to export.",
          variant: "destructive",
        });
        setExporting(false);
        return;
      }

      // Get usernames for orders
      const { data: users } = await supabase
        .from('users')
        .select('id, username');

      const userMap = new Map((users || []).map(u => [u.id, u.username]));

      let csvContent = "Order ID,Username,Credits,Amount,Status,Created At\n";
      
      orders.forEach((order) => {
        const row = [
          `"${order.order_id}"`,
          `"${userMap.get(order.user_id) || 'Unknown'}"`,
          order.credits,
          order.amount,
          `"${order.status}"`,
          `"${new Date(order.created_at).toLocaleString()}"`,
        ].join(",");
        csvContent += row + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `all-orders-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Exported ${orders.length} orders.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export orders.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Bulk Operations
        </CardTitle>
        <CardDescription>Perform bulk actions and export data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bulk Add Credits */}
        <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-4">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Bulk Add Credits
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Usernames (one per line)</label>
              <Textarea
                placeholder="Enter usernames..."
                value={usernames}
                onChange={(e) => setUsernames(e.target.value)}
                rows={5}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Credits to add</label>
                <Input
                  type="number"
                  placeholder="e.g. 10"
                  value={creditsToAdd}
                  onChange={(e) => setCreditsToAdd(e.target.value)}
                  min="1"
                  max="10000"
                />
              </div>
              <Button 
                onClick={handleBulkAddCredits} 
                disabled={processing}
                className="w-full"
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add Credits to All
              </Button>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Download className="w-4 h-4" />
            Data Export
          </h4>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={exportAllUsers}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export All Users
            </Button>
            <Button
              variant="outline"
              onClick={exportAllOrders}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export All Orders
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
