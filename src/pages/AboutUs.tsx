import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Shield, Zap, Users, Target, CheckCircle } from "lucide-react";

const AboutUs = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-grid opacity-40 pointer-events-none" />
      
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Phone className="w-5 h-5 text-foreground" />
            <span className="font-semibold text-foreground">NumberInfo</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 relative">
        <div className="container max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            About <span className="gradient-text">NumberInfo</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Empowering individuals and businesses with reliable phone number intelligence across India.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-12 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                At NumberInfo, we believe everyone deserves access to reliable phone number information. 
                Our mission is to provide fast, accurate, and affordable phone number lookup services 
                that help you make informed decisions about unknown callers.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Whether you're verifying a business contact, identifying a missed call, or conducting 
                due diligence, NumberInfo gives you the information you need in seconds.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-8 h-8 text-foreground" />
                <h3 className="text-xl font-semibold text-foreground">Our Goal</h3>
              </div>
              <p className="text-muted-foreground">
                To become India's most trusted phone number intelligence platform, serving millions 
                of users with accurate and up-to-date information.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-12 px-4 bg-card/50">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Our Values</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Privacy First</h3>
              <p className="text-sm text-muted-foreground">
                We respect user privacy and only provide publicly available information while ensuring 
                your searches remain confidential.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Speed & Accuracy</h3>
              <p className="text-sm text-muted-foreground">
                Get results in seconds, not minutes. Our advanced systems ensure you receive 
                accurate information quickly.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Customer Focus</h3>
              <p className="text-sm text-muted-foreground">
                Our transparent pricing and dedicated support ensure you always get the best 
                value and assistance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-12 px-4">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Why Choose NumberInfo?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "10,000+ successful lookups completed",
              "Instant results in under 2 seconds",
              "No subscription required - pay per use",
              "Coverage across all Indian telecom operators",
              "Secure and encrypted data handling",
              "24/7 availability with 99.9% uptime",
              "Dedicated customer support",
              "Regular database updates for accuracy"
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-4 bg-card/50">
        <div className="container max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of users who trust NumberInfo for their phone number lookup needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate("/auth")} size="lg">
              Start Free Today
            </Button>
            <Button onClick={() => navigate("/contact")} variant="outline" size="lg">
              Contact Us
            </Button>
          </div>
        </div>
      </section>

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
          <p className="text-xs text-muted-foreground text-center">© 2025 NumberInfo. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default AboutUs;
