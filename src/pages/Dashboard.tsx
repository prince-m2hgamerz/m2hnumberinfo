import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { CreditDisplay } from "@/components/CreditDisplay";
import { NumberLookup } from "@/components/NumberLookup";
import { SearchHistory } from "@/components/SearchHistory";
import { HelpSection } from "@/components/HelpSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { openCashfreeCheckout } from "@/lib/cashfree";
import { CreditCard, Sparkles, Check, Loader2, ExternalLink } from "lucide-react";
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

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
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
    }
  }, [user, loadHistory]);

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

  const verifyPayment = async (orderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { orderId }
      });

      if (error) throw error;

      if (data.success && data.status === 'completed') {
        toast({
          title: "Payment Successful!",
          description: data.message,
        });
        loadUser(); // Reload user to get updated credits
      } else {
        toast({
          title: "Payment Pending",
          description: "Your payment is being processed. Credits will be added shortly.",
        });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
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
        mode: "production",
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
