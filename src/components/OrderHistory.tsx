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
          title: "🎉 Payment Verified!",
          description: `${data.credits} credits have been added to your account.`,
        });
        onOrderVerified();
      } else if (data.status === 'pending' || data.status === 'ACTIVE') {
        toast({
          title: "Still Pending",
          description: "Payment is still being processed. Please try again later.",
        });
      } else {
        toast({
          title: "Payment Status",
          description: data.message || "Payment could not be verified.",
          variant: "destructive",
        });
        onOrderVerified(); // Refresh to show updated status
      }
    } catch (error) {
      console.error("Retry verification error:", error);
      toast({
        title: "Verification Failed",
        description: "Could not verify payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifyingOrder(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  if (loading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-secondary/30 transition-colors rounded-t-xl">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Order History
                {pendingCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-medium">
                    {pendingCount} pending
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm font-normal">{orders.length} orders</span>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/50"
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(order.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-muted-foreground">
                            {order.order_id.slice(0, 20)}...
                          </span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(order.created_at).toLocaleDateString()} at{" "}
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-foreground">₹{Number(order.amount)}</p>
                        <p className="text-xs text-muted-foreground">{order.credits} credits</p>
                      </div>
                      {order.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryVerification(order.order_id)}
                          disabled={verifyingOrder === order.order_id}
                        >
                          {verifyingOrder === order.order_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Verify
                            </>
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
