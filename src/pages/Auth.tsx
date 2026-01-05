import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User, ArrowRight, Loader2 } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const selectedPlan = location.state?.selectedPlan;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || username.length < 3) {
      toast({
        title: "Invalid Username",
        description: "Username must be at least 3 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      toast({
        title: "Invalid Username",
        description: "Username can only contain letters, numbers, and underscores.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Simulate authentication - in production this would call the backend
    setTimeout(() => {
      // Store user in localStorage for demo
      const userData = { username: username.toLowerCase(), credits: isLogin ? 10 : 5 };
      localStorage.setItem("user", JSON.stringify(userData));
      
      toast({
        title: isLogin ? "Welcome back!" : "Account created!",
        description: isLogin 
          ? `Logged in as ${username}` 
          : `Your account has been created with 5 free credits.`,
      });
      
      setLoading(false);
      navigate("/dashboard", { state: { selectedPlan } });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="hero-glow" />
      
      <Navbar />

      <main className="pt-32 pb-20 px-4">
        <div className="container max-w-md mx-auto">
          <Card variant="glass" className="animate-slide-up">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">
                {isLogin ? "Welcome Back" : "Create Account"}
              </CardTitle>
              <CardDescription>
                {isLogin 
                  ? "Enter your username to continue" 
                  : "Choose a username to get started"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Username</label>
                  <Input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="text-lg"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Only letters, numbers, and underscores allowed
                  </p>
                </div>

                {selectedPlan && (
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm text-muted-foreground">Selected plan:</p>
                    <p className="font-semibold text-foreground">
                      {selectedPlan.credits} credits for ₹{selectedPlan.price}
                    </p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  variant="glow" 
                  size="lg" 
                  className="w-full gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {isLogin ? "Login" : "Create Account"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {isLogin 
                      ? "Don't have an account? Sign up" 
                      : "Already have an account? Login"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {!isLogin && (
            <p className="text-center text-sm text-muted-foreground mt-6 animate-fade-in">
              🎉 New accounts get <span className="text-primary font-semibold">5 free credits</span> to try!
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Auth;
