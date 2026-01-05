import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { FeaturesSection } from "@/components/FeaturesSection";
import { PricingSection } from "@/components/PricingSection";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, Sparkles } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/auth");
  };

  const handleSelectPlan = (credits: number, price: number) => {
    navigate("/auth", { state: { selectedPlan: { credits, price } } });
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="hero-glow" />
      
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative">
        <div className="container max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Trusted by 10,000+ users</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-slide-up">
            Get Instant{" "}
            <span className="gradient-text">Number Info</span>
            <br />
            In Seconds
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            The most reliable mobile number lookup service in India. Get name, address, and circle information instantly with our pay-as-you-go credit system.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button onClick={handleGetStarted} variant="glow" size="xl" className="gap-2">
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="glass" size="xl" className="gap-2" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>
              View Pricing
            </Button>
          </div>

          {/* Demo Card */}
          <div className="mt-16 max-w-md mx-auto animate-float">
            <div className="glass-card p-6 text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sample Result</p>
                  <p className="font-mono text-foreground">98XXXXXXXX</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium text-foreground">John Doe</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Circle</p>
                  <p className="text-sm font-medium text-foreground">Maharashtra</p>
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
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="container max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>© 2024 NumberInfo. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
