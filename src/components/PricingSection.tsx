import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

interface PricingCardProps {
  credits: number;
  price: number;
  popular?: boolean;
  onSelect: () => void;
}

const PricingCard = ({ credits, price, popular, onSelect }: PricingCardProps) => {
  const pricePerCredit = (price / credits).toFixed(2);
  
  return (
    <Card 
      variant={popular ? "glow" : "glass"} 
      className={`relative overflow-hidden ${popular ? 'scale-105 z-10' : ''}`}
    >
      {popular && (
        <div className="absolute top-0 left-0 right-0 bg-primary py-1 text-center">
          <span className="text-xs font-semibold text-primary-foreground flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" /> MOST POPULAR
          </span>
        </div>
      )}
      <CardHeader className={popular ? "pt-10" : ""}>
        <CardTitle className="text-center">
          <span className="text-4xl font-bold font-mono gradient-text">{credits}</span>
          <span className="text-muted-foreground text-lg ml-2">Credits</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <span className="text-3xl font-bold text-foreground">₹{price}</span>
          <p className="text-sm text-muted-foreground mt-1">
            ₹{pricePerCredit} per lookup
          </p>
        </div>
        <ul className="space-y-3">
          <li className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-success" />
            <span>Instant activation</span>
          </li>
          <li className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-success" />
            <span>No expiry date</span>
          </li>
          <li className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-success" />
            <span>Full data access</span>
          </li>
        </ul>
        <Button 
          onClick={onSelect}
          variant={popular ? "glow" : "glass"} 
          className="w-full"
          size="lg"
        >
          Buy Credits
        </Button>
      </CardContent>
    </Card>
  );
};

interface PricingSectionProps {
  onSelectPlan: (credits: number, price: number) => void;
}

export const PricingSection = ({ onSelectPlan }: PricingSectionProps) => {
  const plans = [
    { credits: 10, price: 5 },
    { credits: 50, price: 30, popular: true },
    { credits: 100, price: 80 },
  ];

  return (
    <section className="py-20 px-4 relative">
      <div className="hero-glow" />
      <div className="container max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simple, Transparent <span className="gradient-text">Pricing</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose a credit pack that fits your needs. No hidden fees, no subscriptions.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {plans.map((plan, index) => (
            <div 
              key={plan.credits} 
              className="animate-slide-up"
              style={{ animationDelay: `${0.1 * (index + 1)}s` }}
            >
              <PricingCard 
                {...plan} 
                onSelect={() => onSelectPlan(plan.credits, plan.price)} 
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
