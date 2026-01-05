import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
    
    const trimmedUsername = username.trim().toLowerCase();

    if (!trimmedUsername || trimmedUsername.length < 3) {
      toast({
        title: "Invalid Username",
        description: "Username must be at least 3 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      toast({
        title: "Invalid Username",
        description: "Username can only contain letters, numbers, and underscores.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Check if user exists
        const { data: existingUser, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', trimmedUsername)
          .maybeSingle();

        if (error) throw error;

        if (!existingUser) {
          toast({
            title: "User Not Found",
            description: "No account found with this username. Try signing up.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (existingUser.banned) {
          toast({
            title: "Account Banned",
            description: "Your account has been banned. Please contact support.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        localStorage.setItem("username", trimmedUsername);
        toast({
          title: "Welcome back!",
          description: `Logged in as ${trimmedUsername}`,
        });
        navigate("/dashboard", { state: { selectedPlan } });

      } else {
        // Check if username already exists
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('username')
          .eq('username', trimmedUsername)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingUser) {
          toast({
            title: "Username Taken",
            description: "This username is already registered. Try logging in.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Create new user with 5 free credits
        const { error: createError } = await supabase
          .from('users')
          .insert({ username: trimmedUsername, credits: 5 });

        if (createError) throw createError;

        localStorage.setItem("username", trimmedUsername);
        toast({
          title: "Account created!",
          description: "Your account has been created with 5 free credits.",
        });
        navigate("/dashboard", { state: { selectedPlan } });
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
