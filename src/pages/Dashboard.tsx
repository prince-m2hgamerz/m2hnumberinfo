import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { CreditDisplay } from "@/components/CreditDisplay";
import { NumberLookup } from "@/components/NumberLookup";
import { SearchHistory } from "@/components/SearchHistory";
import { HelpSection } from "@/components/HelpSection";
import { OrderHistory } from "@/components/OrderHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCreditNotification } from "@/hooks/useCreditNotification";
import { openCashfreeCheckout } from "@/lib/cashfree";
import { CreditCard, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  username: string;
  credits: number;
  banned: boolean;
}

interface SearchHistoryItem {
  id: string;
  phone_number: string;
  name: string | null;
  address: string | null;
  circle: string | null;
  created_at: string;
}

interface CreditPack {
  id: string;
  credits: number;
  price: number;
  is_popular: boolean;
}

interface Order {
  id: string;
  order_id: string;
  credits: number;
  amount: number;
  status: string;
  created_at: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [buyingCredits, setBuyingCredits] = useState<number | null>(null);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { playNotificationSound } = useCreditNotification();
  
  const selectedPlan = location.state?.selectedPlan;

  const loadUser = useCallback(async () => {
    const storedUsername = localStorage.getItem("username");
    if (!storedUsername) {
      navigate("/auth");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', storedUsername)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (data.banned) {
          toast({
            title: "Account Banned",
            description: "Your account has been banned. Please contact support.",
            variant: "destructive",
          });
          localStorage.removeItem("username");
          navigate("/auth");
          return;
        }
        setUser(data);
      } else {
        localStorage.removeItem("username");
        navigate("/auth");
      }
    } catch (error) {
      console.error("Error loading user:", error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  const loadHistory = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    // Load credit packs
    const loadCreditPacks = async () => {
      const { data } = await supabase
        .from('credit_packs')
        .select('*')
        .eq('is_active', true)
        .order('credits', { ascending: true });
      if (data) setCreditPacks(data);
    };
    loadCreditPacks();
  }, [loadUser]);

  useEffect(() => {
    if (user) {
      loadHistory(user.id);
      loadOrders(user.id);
    }
  }, [user, loadHistory, loadOrders]);

  // Subscribe to real-time credit updates
  useEffect(() => {
    if (!user) return;

    console.log("Setting up realtime subscription for user:", user.id);
    
    const channel = supabase
      .channel('user-credits-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          const newCredits = (payload.new as User).credits;
          const oldCredits = (payload.old as User).credits;
          
          if (newCredits > oldCredits) {
            const addedCredits = newCredits - oldCredits;
            console.log(`Credits added via webhook: +${addedCredits}`);
            
            // Play notification sound
            playNotificationSound();
            
            // Show notification
            setCreditsAdded({ credits: addedCredits, newBalance: newCredits });
            toast({
              title: "🎉 Credits Added!",
              description: `+${addedCredits} credits have been added to your account via payment.`,
            });
            
            // Update local user state
            setUser(prev => prev ? { ...prev, credits: newCredits } : null);
            
            // Refresh orders to show updated status
            loadOrders(user.id);
            
            // Auto-hide after 10 seconds
            setTimeout(() => setCreditsAdded(null), 10000);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast, loadOrders]);

  // Handle payment return
  useEffect(() => {
    const orderId = searchParams.get('order_id');
    const status = searchParams.get('status');

    if (orderId && status) {
      // Clear the URL params
      window.history.replaceState({}, '', '/dashboard');

      // For any return, verify the payment - webhook may have already processed it
      // The verify-payment endpoint handles "already completed" gracefully
      verifyPayment(orderId);
    }
  }, [searchParams]);

  const [creditsAdded, setCreditsAdded] = useState<{ credits: number; newBalance: number } | null>(null);

  const verifyPayment = async (orderId: string, retryCount = 0) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { orderId }
      });

      if (error) throw error;

      if (data.success && data.status === 'completed') {
        // Only show notification if realtime hasn't already shown it
        if (!creditsAdded) {
          setCreditsAdded({ credits: data.credits, newBalance: data.newBalance });
          playNotificationSound();
          toast({
            title: "🎉 Payment Successful!",
            description: data.message,
          });
          setTimeout(() => setCreditsAdded(null), 10000);
        }
        loadUser();
      } else if (data.status === 'pending' || data.status === 'ACTIVE') {
        // Payment still processing - retry a few times as webhook might be processing
        if (retryCount < 3) {
          toast({
            title: "Verifying Payment...",
            description: "Please wait while we confirm your payment.",
          });
          setTimeout(() => verifyPayment(orderId, retryCount + 1), 2000);
        } else {
          toast({
            title: "Payment Processing",
            description: "Your payment is being processed. Credits will be added automatically.",
          });
        }
      } else if (data.status === 'failed' || data.status === 'EXPIRED' || data.status === 'TERMINATED') {
        toast({
          title: "Payment Failed",
          description: "Your payment was not successful. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      // Don't show error toast if credits were already added via realtime
      if (!creditsAdded) {
        toast({
          title: "Verification Error",
          description: "Could not verify payment. Credits will be added automatically if successful.",
          variant: "destructive",
        });
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("username");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  const handleLookup = (newCredits: number) => {
    if (user) {
      setUser({ ...user, credits: newCredits });
    }
  };

  const handleHistoryUpdate = () => {
    if (user) {
      loadHistory(user.id);
    }
  };

  const handleBuyCredits = async (credits: number, price: number) => {
    if (!user) return;

    setBuyingCredits(credits);

    try {
      const { data, error } = await supabase.functions.invoke("create-order", {
        body: { userId: user.id, credits, amount: price },
      });

      if (error) throw error;

      const paymentSessionId: string | undefined = data?.paymentSessionId;

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
        description:
          "Complete your payment in the new tab. Credits will be added automatically.",
      });
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Payment Error",
        description:
          error instanceof Error ? error.message : "Failed to initiate payment",
        variant: "destructive",
      });
    } finally {
      setBuyingCredits(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 bg-grid opacity-40 pointer-events-none" />
      
      <Navbar user={{ username: user.username, credits: user.credits }} onLogout={handleLogout} />

      <main className="pt-20 pb-16 px-4">
        <div className="container max-w-4xl mx-auto space-y-6">
          {/* Credits Added Success Banner */}
          {creditsAdded && (
            <div className="animate-fade-in p-4 rounded-lg bg-success/10 border border-success/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-success/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="font-medium text-success text-sm">
                    +{creditsAdded.credits} Credits Added
                  </p>
                  <p className="text-xs text-muted-foreground">
                    New balance: <span className="font-mono font-medium text-foreground">{creditsAdded.newBalance}</span>
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCreditsAdded(null)}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Credit Display */}
          <CreditDisplay credits={user.credits} username={user.username} />

          {/* Two column layout for lookup and history on larger screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NumberLookup 
              userId={user.id}
              credits={user.credits} 
              onLookup={handleLookup}
              onHistoryUpdate={handleHistoryUpdate}
            />
            <SearchHistory history={history} loading={historyLoading} />
          </div>

          {/* Order History */}
          <OrderHistory 
            orders={orders} 
            loading={ordersLoading} 
            onOrderVerified={() => {
              loadUser();
              if (user) loadOrders(user.id);
            }} 
          />

          {/* Buy Credits Section */}
          <Card className="animate-fade-in">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-4 h-4" />
                Buy Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-3 ${creditPacks.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
                {creditPacks.map((pack) => (
                  <div
                    key={pack.id}
                    className={`relative p-4 rounded-md border transition-colors cursor-pointer ${
                      pack.is_popular 
                        ? "bg-secondary border-muted-foreground/30" 
                        : "bg-secondary/30 border-border hover:border-muted-foreground/30"
                    } ${buyingCredits === pack.credits ? 'opacity-70' : ''}`}
                    onClick={() => !buyingCredits && handleBuyCredits(pack.credits, Number(pack.price))}
                  >
                    {pack.is_popular && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                        <span className="px-2 py-0.5 rounded-md bg-foreground text-background text-xs font-medium">
                          Popular
                        </span>
                      </div>
                    )}
                    <div className="text-center space-y-2 pt-1">
                      <div>
                        <span className="text-2xl font-bold font-mono text-foreground">{pack.credits}</span>
                        <span className="text-muted-foreground text-sm ml-1">cr</span>
                      </div>
                      <div className="text-lg font-semibold text-foreground">₹{Number(pack.price)}</div>
                      <p className="text-xs text-muted-foreground">
                        ₹{(Number(pack.price) / pack.credits).toFixed(2)}/lookup
                      </p>
                      <Button 
                        variant={pack.is_popular ? "default" : "outline"} 
                        size="sm" 
                        className="w-full"
                        disabled={!!buyingCredits}
                      >
                        {buyingCredits === pack.credits ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Buy"
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Help Section */}
          <HelpSection userId={user.id} username={user.username} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
