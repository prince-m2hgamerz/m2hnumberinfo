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
        const { data: existingUser, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', trimmedUsername)
          .maybeSingle();

        if (error) throw error;

        if (!existingUser) {
          toast({
            title: "User Not Found",
            description: "No account found. Try signing up.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (existingUser.banned) {
          toast({
            title: "Account Banned",
            description: "Please contact support.",
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
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('username')
          .eq('username', trimmedUsername)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingUser) {
          toast({
            title: "Username Taken",
            description: "This username is already registered.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error: createError } = await supabase
          .from('users')
          .insert({ username: trimmedUsername, credits: 5 });

        if (createError) throw createError;

        localStorage.setItem("username", trimmedUsername);
        toast({
          title: "Account created!",
          description: "You have 5 free credits to start.",
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
      <div className="fixed inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="hero-glow" />
      
      <Navbar />

      <main className="pt-28 pb-16 px-4">
        <div className="container max-w-sm mx-auto">
          <Card className="animate-slide-up">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center mx-auto mb-4">
                <User className="w-6 h-6 text-foreground" />
              </div>
              <CardTitle className="text-xl">
                {isLogin ? "Welcome Back" : "Create Account"}
              </CardTitle>
              <CardDescription className="text-sm">
                {isLogin 
                  ? "Enter your username to continue" 
                  : "Choose a username to get started"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Letters, numbers, and underscores only
                  </p>
                </div>

                {selectedPlan && (
                  <div className="p-3 rounded-md bg-secondary border border-border">
                    <p className="text-xs text-muted-foreground">Selected plan</p>
                    <p className="font-medium text-foreground text-sm">
                      {selectedPlan.credits} credits for ₹{selectedPlan.price}
                    </p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {isLogin ? "Login" : "Create Account"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
            <p className="text-center text-sm text-muted-foreground mt-4 animate-fade-in">
              New accounts get <span className="text-foreground font-medium">5 free credits</span>
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Auth;