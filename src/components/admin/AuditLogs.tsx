import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Search, 
  Loader2, 
  RefreshCw,
  Download,
  Shield,
  CreditCard,
  Ban,
  UserPlus
} from "lucide-react";

interface AuditLog {
  id: string;
  admin_user_id: string;
  admin_username: string;
  action_type: string;
  target_user_id: string | null;
  target_username: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setLogs((data as AuditLog[]) || []);
    } catch (error) {
      console.error("Error loading audit logs:", error);
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    if (logs.length === 0) {
      toast({
        title: "No Data",
        description: "No audit logs to export.",
        variant: "destructive",
      });
      return;
    }

    let csvContent = "Date,Admin,Action,Target User,Details\n";
    
    logs.forEach((log) => {
      const row = [
        `"${new Date(log.created_at).toLocaleString()}"`,
        `"${log.admin_username}"`,
        `"${log.action_type}"`,
        `"${log.target_username || 'N/A'}"`,
        `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`,
      ].join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Audit logs exported successfully.",
    });
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'role_added':
      case 'role_removed':
        return <Shield className="w-4 h-4" />;
      case 'credits_added':
      case 'bulk_credits_added':
        return <CreditCard className="w-4 h-4" />;
      case 'user_banned':
      case 'user_unbanned':
        return <Ban className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'role_added':
        return 'text-success bg-success/10';
      case 'role_removed':
        return 'text-warning bg-warning/10';
      case 'credits_added':
      case 'bulk_credits_added':
        return 'text-primary bg-primary/10';
      case 'user_banned':
        return 'text-destructive bg-destructive/10';
      case 'user_unbanned':
        return 'text-success bg-success/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const formatActionType = (actionType: string) => {
    return actionType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const filteredLogs = logs.filter(log =>
    log.admin_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.target_username?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  if (loading) {
    return (
      <Card variant="glass">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Audit Logs
            </CardTitle>
            <CardDescription>Track all admin actions</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadLogs}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No audit logs found</p>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-md bg-secondary/30 border border-border/50"
              >
                <div className={`p-2 rounded-md ${getActionColor(log.action_type)}`}>
                  {getActionIcon(log.action_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">
                      {formatActionType(log.action_type)}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    by <span className="text-foreground">{log.admin_username}</span>
                    {log.target_username && (
                      <> on <span className="text-foreground">{log.target_username}</span></>
                    )}
                  </p>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
