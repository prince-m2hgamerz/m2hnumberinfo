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
import { openCashfreeCheckout } from "@/lib/cashfree";
import { CreditCard, Sparkles, Check, Loader2, ExternalLink, Bell } from "lucide-react";
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

      if (status === 'PAID' || status === 'SUCCESS') {
        // Verify payment and add credits
        verifyPayment(orderId);
      } else {
        toast({
          title: "Payment Failed",
          description: "Your payment was not successful. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [searchParams]);

  const [creditsAdded, setCreditsAdded] = useState<{ credits: number; newBalance: number } | null>(null);

  const verifyPayment = async (orderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { orderId }
      });

      if (error) throw error;

      if (data.success && data.status === 'completed') {
        setCreditsAdded({ credits: data.credits, newBalance: data.newBalance });
        toast({
          title: "🎉 Payment Successful!",
          description: data.message,
        });
        loadUser(); // Reload user to get updated credits
        // Auto-hide success message after 10 seconds
        setTimeout(() => setCreditsAdded(null), 10000);
      } else if (data.status === 'pending' || data.status === 'ACTIVE') {
        toast({
          title: "Payment Pending",
          description: "Your payment is being processed. Credits will be added shortly.",
        });
      } else {
        toast({
          title: "Payment Issue",
          description: data.message || "There was an issue with your payment.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      toast({
        title: "Verification Error",
        description: "Could not verify payment. Please contact support if credits are not added.",
        variant: "destructive",
      });
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      
      <Navbar user={{ username: user.username, credits: user.credits }} onLogout={handleLogout} />

      <main className="pt-24 pb-20 px-4">
        <div className="container max-w-6xl mx-auto space-y-8">
          {/* Credits Added Success Banner */}
          {creditsAdded && (
            <div className="animate-fade-in p-4 rounded-xl bg-success/10 border border-success/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-semibold text-success">
                    +{creditsAdded.credits} Credits Added!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your new balance: <span className="font-mono font-bold text-foreground">{creditsAdded.newBalance}</span> credits
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCreditsAdded(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Credit Display */}
          <div className="animate-fade-in">
            <CreditDisplay credits={user.credits} username={user.username} />
          </div>

          {/* Number Lookup */}
          <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <NumberLookup 
              userId={user.id}
              credits={user.credits} 
              onLookup={handleLookup}
              onHistoryUpdate={handleHistoryUpdate}
            />
          </div>

          {/* Search History */}
          <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
            <SearchHistory history={history} loading={historyLoading} />
          </div>

          {/* Order History */}
          <div className="animate-fade-in" style={{ animationDelay: "0.18s" }}>
            <OrderHistory 
              orders={orders} 
              loading={ordersLoading} 
              onOrderVerified={() => {
                loadUser();
                if (user) loadOrders(user.id);
              }} 
            />
          </div>

          {/* Buy Credits Section */}
          <Card variant="glass" className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Buy More Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {creditPacks.map((pack) => (
                  <div
                    key={pack.id}
                    className={`relative p-6 rounded-xl border transition-all duration-200 cursor-pointer hover:border-primary/50 ${
                      pack.is_popular 
                        ? "bg-primary/5 border-primary/30" 
                        : "bg-secondary/30 border-border"
                    } ${buyingCredits === pack.credits ? 'opacity-70' : ''}`}
                    onClick={() => !buyingCredits && handleBuyCredits(pack.credits, Number(pack.price))}
                  >
                    {pack.is_popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                          <Sparkles className="w-3 h-3" />
                          BEST VALUE
                        </span>
                      </div>
                    )}
                    <div className="text-center space-y-3">
                      <div>
                        <span className="text-3xl font-bold font-mono gradient-text">{pack.credits}</span>
                        <span className="text-muted-foreground ml-1">credits</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">₹{Number(pack.price)}</div>
                      <p className="text-xs text-muted-foreground">
                        ₹{(Number(pack.price) / pack.credits).toFixed(2)} per lookup
                      </p>
                      <ul className="space-y-1 text-left">
                        <li className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-success" />
                          Instant activation
                        </li>
                        <li className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-success" />
                          Never expires
                        </li>
                      </ul>
                      <Button 
                        variant={pack.is_popular ? "glow" : "outline"} 
                        size="sm" 
                        className="w-full mt-2"
                        disabled={!!buyingCredits}
                      >
                        {buyingCredits === pack.credits ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <ExternalLink className="w-4 h-4 mr-2" />
                        )}
                        Buy Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Help Section */}
          <div className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
            <HelpSection userId={user.id} username={user.username} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
