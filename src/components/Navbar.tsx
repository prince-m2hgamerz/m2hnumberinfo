import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, LogIn, LogOut, Shield, LayoutDashboard, Menu, X } from "lucide-react";

interface NavbarProps {
  user?: { username: string; credits: number } | null;
  onLogout?: () => void;
}

export const Navbar = ({ user, onLogout }: NavbarProps) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Track credit changes for animation
  const [creditChange, setCreditChange] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevCreditsRef = useRef<number | null>(null);

  useEffect(() => {
    if (user && prevCreditsRef.current !== null) {
      const diff = user.credits - prevCreditsRef.current;
      if (diff > 0) {
        setCreditChange(diff);
        setIsAnimating(true);
        
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
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-foreground" />
            <span className="font-semibold text-foreground">
              NumberInfo
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-2">
            {user ? (
              <>
                {/* Credits Display */}
                <div className="relative">
                  <div 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all duration-200 ${
                      isAnimating 
                        ? 'bg-success/10 border-success/50' 
                        : 'bg-secondary border-border'
                    }`}
                  >
                    <span className={`font-mono text-sm font-medium transition-colors ${
                      isAnimating ? 'text-success' : 'text-foreground'
                    }`}>
                      {user.credits} credits
                    </span>
                  </div>
                  
                  {/* Credit change badge */}
                  {creditChange !== null && (
                    <div className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-success text-success-foreground text-xs font-medium animate-fade-in">
                      +{creditChange}
                    </div>
                  )}
                </div>

                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">
                    <LayoutDashboard className="w-4 h-4 mr-1.5" />
                    Dashboard
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={onLogout}>
                  <LogOut className="w-4 h-4 mr-1.5" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                {!isAdmin && (
                  <Link to="/auth">
                    <Button variant="ghost" size="sm">
                      <LogIn className="w-4 h-4 mr-1.5" />
                      Login
                    </Button>
                  </Link>
                )}
                <Link to="/admin">
                  <Button variant="outline" size="sm">
                    <Shield className="w-4 h-4 mr-1.5" />
                    Admin
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="sm:hidden p-2 rounded-md hover:bg-secondary transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="sm:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-2">
              {user ? (
                <>
                  <div className="flex items-center justify-between px-3 py-2 rounded-md bg-secondary">
                    <span className="text-sm text-muted-foreground">Credits</span>
                    <span className="font-mono font-medium">{user.credits}</span>
                  </div>
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { onLogout?.(); setMobileMenuOpen(false); }}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  {!isAdmin && (
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <LogIn className="w-4 h-4 mr-2" />
                        Login
                      </Button>
                    </Link>
                  )}
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-start">
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};