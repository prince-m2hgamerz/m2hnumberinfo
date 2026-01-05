import { Search, CreditCard, Shield, Zap } from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard = ({ icon, title, description, delay = 0 }: FeatureCardProps) => (
  <div 
    className="p-6 rounded-lg border border-border bg-card hover:border-muted-foreground/30 transition-colors animate-fade-in"
    style={{ animationDelay: `${delay}s` }}
  >
    <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center mb-4 text-foreground">
      {icon}
    </div>
    <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
  </div>
);

export const FeaturesSection = () => {
  const features = [
    {
      icon: <Search className="w-5 h-5" />,
      title: "Instant Lookup",
      description: "Get detailed information in seconds with our fast and reliable API.",
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      title: "Pay As You Go",
      description: "Simple credit system. Buy credits, use them whenever you need.",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Secure & Private",
      description: "All queries are encrypted. We never store your search history.",
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Lightning Fast",
      description: "Optimized for speed with sub-second response times.",
    },
  ];

  return (
    <section className="py-20 px-4 border-t border-border">
      <div className="container max-w-5xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Why NumberInfo?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            The reliable number lookup service with transparent pricing.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} delay={0.05 * (index + 1)} />
          ))}
        </div>
      </div>
    </section>
  );
};