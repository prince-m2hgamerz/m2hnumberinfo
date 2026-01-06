import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Receipt, ChevronDown, ChevronUp, CheckCircle, Clock, XCircle, RefreshCw, Loader2, PlayCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { openCashfreeCheckout } from "@/lib/cashfree";
import { differenceInHours, differenceInMinutes } from "date-fns";

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
  onNotification?: (type: 'order_success' | 'order_fail' | 'order_create', title: string, message: string) => void;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export const OrderHistory = ({ orders, loading, onOrderVerified, onNotification }: OrderHistoryProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [verifyingOrder, setVerifyingOrder] = useState<string | null>(null);
  const [resumingOrder, setResumingOrder] = useState<string | null>(null);
  const { toast } = useToast();

  // Check if order can be resumed (within 2 hours)
  const canResumeOrder = (order: Order): boolean => {
    if (order.status !== 'pending') return false;
    const createdAt = new Date(order.created_at).getTime();
    const now = Date.now();
    return (now - createdAt) < TWO_HOURS_MS;
  };

  // Get time remaining for resumable orders
  const getTimeRemaining = (order: Order): string => {
    const createdAt = new Date(order.created_at);
    const expiryTime = new Date(createdAt.getTime() + TWO_HOURS_MS);
    const now = new Date();
    
    const hoursLeft = differenceInHours(expiryTime, now);
    const minutesLeft = differenceInMinutes(expiryTime, now) % 60;
    
    if (hoursLeft > 0) {
      return `${hoursLeft}h ${minutesLeft}m left`;
    }
    return `${minutesLeft}m left`;
  };

  // Check if order is expired (over 2 hours and still pending)
  const isExpiredOrder = (order: Order): boolean => {
    if (order.status !== 'pending') return false;
    const createdAt = new Date(order.created_at).getTime();
    const now = Date.now();
    return (now - createdAt) >= TWO_HOURS_MS;
  };

  // Filter and process orders
  const processedOrders = useMemo(() => {
    return orders.map(order => ({
      ...order,
      canResume: canResumeOrder(order),
      isExpired: isExpiredOrder(order),
      timeRemaining: canResumeOrder(order) ? getTimeRemaining(order) : null,
    }));
  }, [orders]);

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
        onNotification?.('order_success', 'Payment Successful', `${data.credits} credits have been added to your account.`);
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
        onNotification?.('order_fail', 'Payment Failed', 'Your payment could not be verified.');
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

  const handleResumeOrder = async (order: Order) => {
    setResumingOrder(order.order_id);
    try {
      // Call create-order with resume flag to get a new payment session
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: { 
          resumeOrderId: order.order_id,
          credits: order.credits,
          amount: Number(order.amount)
        }
      });

      if (error) throw error;

      const paymentSessionId = data?.paymentSessionId;

      if (!paymentSessionId) {
        throw new Error("Payment session missing. Please try again.");
      }

      await openCashfreeCheckout({
        paymentSessionId,
        mode: (data?.cashfreeMode ?? "production") as "sandbox" | "production",
        redirectTarget: "_blank",
      });

      toast({
        title: "Payment Page Opened",
        description: "Complete your payment in the new tab.",
      });
    } catch (error) {
      console.error("Resume order error:", error);
      toast({
        title: "Resume Failed",
        description: error instanceof Error ? error.message : "Could not resume order.",
        variant: "destructive",
      });
    } finally {
      setResumingOrder(null);
    }
  };

  const getStatusBadge = (status: string, isExpired?: boolean) => {
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-xs font-medium">
          <AlertTriangle className="w-3 h-3" />
          Expired
        </span>
      );
    }
    
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
  const resumableCount = processedOrders.filter(o => o.canResume).length;

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
              <div className="flex items-center gap-2 flex-wrap">
                <Receipt className="w-4 h-4" />
                Order History
                {resumableCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                    {resumableCount} resumable
                  </span>
                )}
                {pendingCount > resumableCount && (
                  <span className="px-1.5 py-0.5 rounded-md bg-warning/10 text-warning text-xs font-medium">
                    {pendingCount - resumableCount} expired
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
                {processedOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md border ${
                      order.canResume 
                        ? "bg-primary/5 border-primary/30" 
                        : order.isExpired 
                          ? "bg-destructive/5 border-destructive/30"
                          : "bg-secondary/30 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground truncate">
                            {order.order_id.slice(0, 16)}...
                          </span>
                          {getStatusBadge(order.status, order.isExpired)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                          {order.timeRemaining && (
                            <span className="text-xs text-primary font-medium">
                              • {order.timeRemaining}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 mt-2 sm:mt-0">
                      <div className="text-right">
                        <p className="font-medium text-foreground text-sm">₹{Number(order.amount)}</p>
                        <p className="text-xs text-muted-foreground">{order.credits} cr</p>
                      </div>
                      {order.canResume && (
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleResumeOrder(order)}
                            disabled={resumingOrder === order.order_id}
                            className="gap-1"
                          >
                            {resumingOrder === order.order_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <PlayCircle className="w-3 h-3" />
                                Resume
                              </>
                            )}
                          </Button>
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
                        </div>
                      )}
                      {order.status === 'pending' && !order.canResume && !order.isExpired && (
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
