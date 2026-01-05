import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { CreditDisplay } from "@/components/CreditDisplay";
import { NumberLookup } from "@/components/NumberLookup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Sparkles, Check } from "lucide-react";

interface User {
  username: string;
  credits: number;
}

const creditPacks = [
  { credits: 10, price: 5 },
  { credits: 50, price: 30, popular: true },
  { credits: 100, price: 80 },
];

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const selectedPlan = location.state?.selectedPlan;

  useEffect(() => {
    // Check for user in localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/auth");
    }

    // If there's a selected plan from navigation, show payment prompt
    if (selectedPlan) {
      toast({
        title: "Complete Your Purchase",
        description: `Select the ${selectedPlan.credits} credits pack below to proceed with payment.`,
      });
    }
  }, [navigate, selectedPlan, toast]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/");
  };

  const handleLookup = () => {
    if (user) {
      const updatedUser = { ...user, credits: user.credits - 1 };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  const handleBuyCredits = (credits: number, price: number) => {
    // In production, this would initiate the Cashfree payment flow
    toast({
      title: "Payment Integration Required",
      description: `To purchase ${credits} credits for ₹${price}, the payment gateway needs to be connected.`,
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      
      <Navbar user={user} onLogout={handleLogout} />

      <main className="pt-24 pb-20 px-4">
        <div className="container max-w-6xl mx-auto space-y-8">
          {/* Credit Display */}
          <div className="animate-fade-in">
            <CreditDisplay credits={user.credits} username={user.username} />
          </div>

          {/* Number Lookup */}
          <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <NumberLookup credits={user.credits} onLookup={handleLookup} />
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
                    key={pack.credits}
                    className={`relative p-6 rounded-xl border transition-all duration-200 cursor-pointer hover:border-primary/50 ${
                      pack.popular 
                        ? "bg-primary/5 border-primary/30" 
                        : "bg-secondary/30 border-border"
                    }`}
                    onClick={() => handleBuyCredits(pack.credits, pack.price)}
                  >
                    {pack.popular && (
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
                      <div className="text-2xl font-bold text-foreground">₹{pack.price}</div>
                      <p className="text-xs text-muted-foreground">
                        ₹{(pack.price / pack.credits).toFixed(2)} per lookup
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
                        variant={pack.popular ? "glow" : "outline"} 
                        size="sm" 
                        className="w-full mt-2"
                      >
                        Buy Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
