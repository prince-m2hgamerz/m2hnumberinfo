import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { FeaturesSection } from "@/components/FeaturesSection";
import { PricingSection } from "@/components/PricingSection";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, MapPin, User } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  const handleSelectPlan = (credits: number, price: number) => {
    if (user) {
      navigate("/dashboard", { state: { selectedPlan: { credits, price } } });
    } else {
      navigate("/auth", { state: { selectedPlan: { credits, price } } });
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const displayName = user?.email?.split('@')[0];

  return (
    <div className="min-h-screen bg-background relative">
      {/* Subtle background effects */}
      <div className="fixed inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="hero-glow" />
      
      <Navbar user={user ? { username: displayName || 'User', credits: 0 } : undefined} onLogout={handleLogout} />

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-4 relative">
        <div className="container max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary/50 mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-sm text-muted-foreground">10,000+ lookups completed</span>
          </div>
          
          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-slide-up tracking-tight">
            Phone Number
            <br />
            <span className="gradient-text">Intelligence</span>
          </h1>
          
          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in text-pretty" style={{ animationDelay: "0.1s" }}>
            Get instant access to name, address, and location data for any Indian mobile number. Simple credits, no subscriptions.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <Button onClick={handleGetStarted} size="lg" className="w-full sm:w-auto">
              {user ? "Go to Dashboard" : "Start Free"}
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto"
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
            >
              View Pricing
            </Button>
          </div>

          {/* Demo Card */}
          <div className="mt-20 max-w-sm mx-auto animate-float">
            <div className="rounded-lg border border-border bg-card p-5 text-left">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center">
                  <Phone className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Query</p>
                  <p className="font-mono text-foreground">+91 98XXX XXXXX</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="text-sm font-medium text-foreground">Rahul Sharma</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium text-foreground">Maharashtra, Mumbai</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FeaturesSection />
      
      <div id="pricing">
        <PricingSection onSelectPlan={handleSelectPlan} />
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">NumberInfo</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <button onClick={() => navigate("/about")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</button>
              <button onClick={() => navigate("/contact")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</button>
              <button onClick={() => navigate("/privacy")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</button>
              <button onClick={() => navigate("/terms")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">© 2025 NumberInfo. All rights reserved. This service is for informational purposes only.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;