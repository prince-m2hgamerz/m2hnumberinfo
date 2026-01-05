import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Receipt, ChevronDown, ChevronUp, CheckCircle, Clock, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  order_id: string;
  credits: number;
  amount: number;
  status: string;
  created_at: string;
}

interface OrderHistoryProps {
  orders: Order[];
  loading: boolean;
  onOrderVerified: () => void;
}

export const OrderHistory = ({ orders, loading, onOrderVerified }: OrderHistoryProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [verifyingOrder, setVerifyingOrder] = useState<string | null>(null);
  const { toast } = useToast();

  const handleRetryVerification = async (orderId: string) => {
    setVerifyingOrder(orderId);
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { orderId }
      });

      if (error) throw error;

      if (data.success && data.status === 'completed') {
        toast({
          title: "Payment Verified",
          description: `${data.credits} credits added.`,
        });
        onOrderVerified();
      } else if (data.status === 'pending' || data.status === 'ACTIVE') {
        toast({
          title: "Still Pending",
          description: "Payment is still processing.",
        });
      } else {
        toast({
          title: "Payment Status",
          description: data.message || "Could not verify.",
          variant: "destructive",
        });
        onOrderVerified();
      }
    } catch (error) {
      console.error("Retry verification error:", error);
      toast({
        title: "Error",
        description: "Could not verify payment.",
        variant: "destructive",
      });
    } finally {
      setVerifyingOrder(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-success/10 text-success text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/10 text-warning text-xs font-medium">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="w-4 h-4" />
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-secondary/30 transition-colors pb-4">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Order History
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-warning/10 text-warning text-xs font-medium">
                    {pendingCount} pending
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm font-normal">{orders.length}</span>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-md bg-secondary/30 border border-border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground truncate">
                            {order.order_id.slice(0, 16)}...
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-medium text-foreground text-sm">₹{Number(order.amount)}</p>
                        <p className="text-xs text-muted-foreground">{order.credits} cr</p>
                      </div>
                      {order.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryVerification(order.order_id)}
                          disabled={verifyingOrder === order.order_id}
                        >
                          {verifyingOrder === order.order_id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};