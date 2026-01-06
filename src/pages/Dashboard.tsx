import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { CreditDisplay } from "@/components/CreditDisplay";
import { NumberLookup } from "@/components/NumberLookup";
import { SearchHistory } from "@/components/SearchHistory";
import { HelpSection } from "@/components/HelpSection";
import { OrderHistory } from "@/components/OrderHistory";
import { ProfileSettings } from "@/components/ProfileSettings";
import { ReferralSection } from "@/components/ReferralSection";
import { ExportHistory } from "@/components/ExportHistory";
import { NotificationCenter } from "@/components/NotificationCenter";
import { PaymentLoadingOverlay } from "@/components/PaymentLoadingOverlay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { openCashfreeCheckout } from "@/lib/cashfree";
import { CreditCard, Check, Loader2, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UserData {
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
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [buyingCredits, setBuyingCredits] = useState<number | null>(null);
  const [paymentLoading, setPaymentLoading] = useState<{ credits: number; amount: number } | null>(null);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [creditsAdded, setCreditsAdded] = useState<{ credits: number; newBalance: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user: authUser, loading: authLoading, signOut } = useAuth();
  const { notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll, playSound } =
    useNotifications(authUser?.id);

  const selectedPlan = location.state?.selectedPlan;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !authUser) {
      navigate("/auth", { replace: true });
    }
  }, [authUser, authLoading, navigate]);

  const loadUserData = useCallback(async () => {
    if (!authUser) return;

    try {
      // Check if user exists in users table
      const { data, error } = await supabase.from("users").select("*").eq("id", authUser.id).maybeSingle();

      if (error) throw error;

      if (data) {
        if (data.banned) {
          toast({
            title: "Account Banned",
            description: "Your account has been banned. Please contact support.",
            variant: "destructive",
          });
          await signOut();
          navigate("/auth");
          return;
        }
        setUserData(data);
      } else {
        // Create user entry if it doesn't exist
        const username = authUser.email?.split("@")[0] || "user";
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert({
            id: authUser.id,
            username,
            credits: 2,
          })
          .select()
          .single();

        if (createError) throw createError;
        setUserData(newUser);

        toast({
          title: "Welcome!",
          description: "Your account has been set up with 5 free credits.",
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [authUser, navigate, toast, signOut]);

  const loadHistory = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("search_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
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
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
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
    if (authUser && !authLoading) {
      loadUserData();
      // Load credit packs
      const loadCreditPacks = async () => {
        const { data } = await supabase
          .from("credit_packs")
          .select("*")
          .eq("is_active", true)
          .order("credits", { ascending: true });
        if (data) setCreditPacks(data);
      };
      loadCreditPacks();
    }
  }, [authUser, authLoading, loadUserData]);

  useEffect(() => {
    if (userData) {
      loadHistory(userData.id);
      loadOrders(userData.id);

      // Check for expired orders
      const checkExpiredOrders = async () => {
        try {
          const { data } = await supabase.functions.invoke("check-expired-orders", {
            body: { userId: userData.id },
          });
          if (data?.expiredOrders?.length > 0) {
            data.expiredOrders.forEach((orderId: string) => {
              addNotification("order_fail", "Order Expired", `Order ${orderId.slice(0, 16)}... expired after 2 hours.`);
            });
            loadOrders(userData.id);
          }
        } catch (error) {
          console.error("Error checking expired orders:", error);
        }
      };
      checkExpiredOrders();
    }
  }, [userData, loadHistory, loadOrders, addNotification]);

  // Subscribe to real-time credit updates
  useEffect(() => {
    if (!userData) return;

    const channel = supabase
      .channel("user-credits-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${userData.id}`,
        },
        (payload) => {
          const newCredits = (payload.new as UserData).credits;
          const oldCredits = (payload.old as UserData).credits;

          if (newCredits > oldCredits) {
            const addedCredits = newCredits - oldCredits;

            playSound("credit_add");
            setCreditsAdded({ credits: addedCredits, newBalance: newCredits });
            addNotification("credit_add", "Credits Added", `+${addedCredits} credits added to your account.`, false);
            toast({
              title: "Credits Added!",
              description: `+${addedCredits} credits added to your account.`,
            });

            setUserData((prev) => (prev ? { ...prev, credits: newCredits } : null));
            loadOrders(userData.id);

            setTimeout(() => setCreditsAdded(null), 10000);
          } else if (newCredits < oldCredits) {
            const deductedCredits = oldCredits - newCredits;
            playSound("credit_deduct");
            addNotification("credit_deduct", "Credits Used", `${deductedCredits} credits used for lookup.`, false);
            setUserData((prev) => (prev ? { ...prev, credits: newCredits } : null));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userData?.id, toast, loadOrders, playSound, addNotification]);

  // Handle payment return
  useEffect(() => {
    const orderId = searchParams.get("order_id");
    const status = searchParams.get("status");

    if (orderId && status) {
      window.history.replaceState({}, "", "/dashboard");
      verifyPayment(orderId);
    }
  }, [searchParams]);

  const verifyPayment = async (orderId: string, retryCount = 0) => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { orderId },
      });

      if (error) throw error;

      if (data.success && data.status === "completed") {
        if (!creditsAdded) {
          setCreditsAdded({ credits: data.credits, newBalance: data.newBalance });
          playSound("order_success");
          addNotification(
            "order_success",
            "Payment Successful",
            `${data.credits} credits added to your account.`,
            false,
          );
          toast({
            title: "Payment Successful!",
            description: data.message,
          });
          setTimeout(() => setCreditsAdded(null), 10000);
        }
        loadUserData();
      } else if (data.status === "pending" || data.status === "ACTIVE") {
        if (retryCount < 3) {
          toast({
            title: "Verifying Payment...",
            description: "Please wait while we confirm your payment.",
          });
          setTimeout(() => verifyPayment(orderId, retryCount + 1), 2000);
        } else {
          toast({
            title: "Payment Processing",
            description: "Credits will be added automatically.",
          });
        }
      } else if (data.status === "failed" || data.status === "EXPIRED" || data.status === "TERMINATED") {
        toast({
          title: "Payment Failed",
          description: "Your payment was not successful. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      if (!creditsAdded) {
        toast({
          title: "Verification Error",
          description: "Credits will be added automatically if successful.",
          variant: "destructive",
        });
      }
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    navigate("/");
  };

  const handleLookup = (newCredits: number) => {
    if (userData) {
      setUserData({ ...userData, credits: newCredits });
    }
  };

  const handleHistoryUpdate = () => {
    if (userData) {
      loadHistory(userData.id);
    }
  };

  const handleBuyCredits = async (credits: number, price: number) => {
    if (!userData || !authUser) return;

    setBuyingCredits(credits);
    setPaymentLoading({ credits, amount: price });

    try {
      const { data, error } = await supabase.functions.invoke("create-order", {
        body: {
          userId: userData.id,
          credits,
          amount: price,
          email: authUser.email,
        },
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

      addNotification(
        "order_create",
        "Order Created",
        `Order for ${credits} credits (₹${price}) created. Complete payment.`,
      );
      toast({
        title: "Payment Page Opened",
        description: "Complete your payment in the new tab.",
      });
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to initiate payment",
        variant: "destructive",
      });
    } finally {
      setBuyingCredits(null);
      setPaymentLoading(null);
    }
  };

  const handleReferralCredits = (bonusCredits: number) => {
    if (userData) {
      setUserData({ ...userData, credits: userData.credits + bonusCredits });
      addNotification("credit_add", "Referral Bonus", `+${bonusCredits} credits from referral!`);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authUser || !userData) {
    return null;
  }

  const displayName = authUser.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 bg-grid opacity-40 pointer-events-none" />

      {/* Payment Loading Overlay */}
      {paymentLoading && (
        <PaymentLoadingOverlay
          isOpen={!!paymentLoading}
          credits={paymentLoading.credits}
          amount={paymentLoading.amount}
        />
      )}

      {/* Notification Center - Fixed position */}
      <div className="fixed top-3 right-20 sm:right-24 z-50">
        <NotificationCenter
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClearAll={clearAll}
        />
      </div>

      <Navbar user={{ username: displayName, credits: userData.credits }} onLogout={handleLogout} />

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
                  <p className="font-medium text-success text-sm">+{creditsAdded.credits} Credits Added</p>
                  <p className="text-xs text-muted-foreground">
                    New balance:{" "}
                    <span className="font-mono font-medium text-foreground">{creditsAdded.newBalance}</span>
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
          <CreditDisplay credits={userData.credits} username={displayName} />

          {/* Two column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NumberLookup
              userId={userData.id}
              credits={userData.credits}
              onLookup={handleLookup}
              onHistoryUpdate={handleHistoryUpdate}
            />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Recent Searches</h3>
                <ExportHistory userId={userData.id} type="search" />
              </div>
              <SearchHistory history={history} loading={historyLoading} />
            </div>
          </div>

          {/* Order History with Export */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Order History</h3>
              <ExportHistory userId={userData.id} type="orders" />
            </div>
            <OrderHistory
              orders={orders}
              loading={ordersLoading}
              onOrderVerified={() => {
                loadUserData();
                if (userData) loadOrders(userData.id);
              }}
              onNotification={(type, title, message) => addNotification(type, title, message)}
            />
          </div>
          <ReferralSection userId={userData.id} username={displayName} onCreditsAdded={handleReferralCredits} />

          {/* Buy Credits Section */}
          <Card className="animate-fade-in">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-4 h-4" />
                Buy Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`grid gap-3 ${creditPacks.length <= 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}
              >
                {creditPacks.map((pack) => (
                  <div
                    key={pack.id}
                    className={`relative p-4 rounded-md border transition-colors cursor-pointer ${
                      pack.is_popular
                        ? "bg-secondary border-muted-foreground/30"
                        : "bg-secondary/30 border-border hover:border-muted-foreground/30"
                    } ${buyingCredits === pack.credits ? "opacity-70" : ""}`}
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
                        {buyingCredits === pack.credits ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buy"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Settings Section */}
          <div className="space-y-4">
            <Button variant="outline" className="w-full justify-between" onClick={() => setShowSettings(!showSettings)}>
              <span className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Account Settings
              </span>
              {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {showSettings && (
              <ProfileSettings
                userId={userData.id}
                userEmail={authUser.email || ""}
                onProfileUpdate={() =>
                  addNotification("profile_update", "Profile Updated", "Your profile has been updated successfully.")
                }
              />
            )}
          </div>

          {/* Help Section */}
          <HelpSection userId={userData.id} username={displayName} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
