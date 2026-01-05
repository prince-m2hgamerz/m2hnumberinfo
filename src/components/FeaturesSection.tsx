import { Search, CreditCard, Shield, Zap } from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard = ({ icon, title, description, delay = 0 }: FeatureCardProps) => (
  <div 
    className="glass-card p-6 glow-hover animate-fade-in"
    style={{ animationDelay: `${delay}s` }}
  >
    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm">{description}</p>
  </div>
);

export const FeaturesSection = () => {
  const features = [
    {
      icon: <Search className="w-6 h-6" />,
      title: "Instant Lookup",
      description: "Get detailed number information in seconds with our powerful API.",
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: "Pay As You Go",
      description: "Flexible credit system. Buy what you need, use when you want.",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure & Private",
      description: "All queries are encrypted and we never store your search history.",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lightning Fast",
      description: "Optimized infrastructure for sub-second response times.",
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Choose <span className="gradient-text">NumberInfo</span>?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The most reliable number lookup service with transparent pricing and instant results.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} delay={0.1 * (index + 1)} />
          ))}
        </div>
      </div>
    </section>
  );
};
