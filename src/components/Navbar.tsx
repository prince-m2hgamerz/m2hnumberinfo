import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, LogIn, LogOut, Shield, LayoutDashboard, Coins, TrendingUp } from "lucide-react";

interface NavbarProps {
  user?: { username: string; credits: number } | null;
  onLogout?: () => void;
}

export const Navbar = ({ user, onLogout }: NavbarProps) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  
  // Track credit changes for animation
  const [creditChange, setCreditChange] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevCreditsRef = useRef<number | null>(null);

  useEffect(() => {
    if (user && prevCreditsRef.current !== null) {
      const diff = user.credits - prevCreditsRef.current;
      if (diff > 0) {
        // Credits increased - show animation
        setCreditChange(diff);
        setIsAnimating(true);
        
        // Clear animation after delay
        const timer = setTimeout(() => {
          setIsAnimating(false);
          setCreditChange(null);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    }
    if (user) {
      prevCreditsRef.current = user.credits;
    }
  }, [user?.credits]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg text-foreground">
              Number<span className="gradient-text">Info</span>
            </span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Credits Display with Animation */}
                <div className="relative">
                  <div 
                    className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 ${
                      isAnimating 
                        ? 'bg-success/20 border-success/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                        : 'bg-secondary/50 border-border/50'
                    }`}
                  >
                    <Coins className={`w-4 h-4 transition-colors duration-300 ${isAnimating ? 'text-success' : 'text-muted-foreground'}`} />
                    <span className={`font-mono font-semibold transition-all duration-300 ${
                      isAnimating ? 'text-success scale-110' : 'text-primary'
                    }`}>
                      {user.credits}
                    </span>
                  </div>
                  
                  {/* Floating badge for credit change */}
                  {creditChange !== null && (
                    <div 
                      className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-success text-success-foreground text-xs font-bold animate-bounce shadow-lg"
                      style={{
                        animation: 'credit-pop 0.5s ease-out, float-up 3s ease-out forwards'
                      }}
                    >
                      <TrendingUp className="w-3 h-3" />
                      +{creditChange}
                    </div>
                  )}
                  
                  {/* Pulse ring animation */}
                  {isAnimating && (
                    <div className="absolute inset-0 rounded-lg border-2 border-success animate-ping opacity-75" />
                  )}
                </div>

                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={onLogout} className="gap-2">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </>
            ) : (
              <>
                {!isAdmin && (
                  <Link to="/auth">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <LogIn className="w-4 h-4" />
                      Login
                    </Button>
                  </Link>
                )}
                <Link to="/admin">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Custom keyframes for credit animation */}
      <style>{`
        @keyframes credit-pop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes float-up {
          0% { transform: translateY(0); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translateY(-20px); opacity: 0; }
        }
      `}</style>
    </nav>
  );
};
