import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, signIn, signUp } = useAuth();
  
  const selectedPlan = location.state?.selectedPlan;

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === "email") newErrors.email = err.message;
          if (err.path[0] === "password") newErrors.password = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email.trim(), password);
        
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Login Failed",
              description: "Invalid email or password. Please try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Login Failed",
              description: error.message,
              variant: "destructive",
            });
          }
          return;
        }

        toast({
          title: "Welcome back!",
          description: "You have been logged in successfully.",
        });
        navigate("/dashboard", { state: { selectedPlan }, replace: true });
      } else {
        const { error } = await signUp(email.trim(), password);
        
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Email Already Registered",
              description: "This email is already in use. Try logging in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sign Up Failed",
              description: error.message,
              variant: "destructive",
            });
          }
          return;
        }

        toast({
          title: "Account Created!",
          description: "Check your email to confirm your account.",
        });
      }
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
                <Mail className="w-6 h-6 text-foreground" />
              </div>
              <CardTitle className="text-xl">
                {isLogin ? "Welcome Back" : "Create Account"}
              </CardTitle>
              <CardDescription className="text-sm">
                {isLogin 
                  ? "Sign in to your account" 
                  : "Sign up with your email"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      autoFocus
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      autoComplete={isLogin ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password}</p>
                  )}
                  {!isLogin && (
                    <p className="text-xs text-muted-foreground">
                      Minimum 6 characters
                    </p>
                  )}
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
                      {isLogin ? "Sign In" : "Create Account"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setErrors({});
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isLogin 
                      ? "Don't have an account? Sign up" 
                      : "Already have an account? Sign in"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {!isLogin && (
            <p className="text-center text-sm text-muted-foreground mt-4 animate-fade-in">
              You'll receive a confirmation email
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Auth;