import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Crown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CreditPack {
  id: string;
  credits: number;
  price: number;
  is_popular: boolean;
  is_featured: boolean;
}

interface PricingCardProps {
  credits: number;
  price: number;
  popular?: boolean;
  featured?: boolean;
  onSelect: () => void;
}

const PricingCard = ({ credits, price, popular, featured, onSelect }: PricingCardProps) => {
  const pricePerCredit = (price / credits).toFixed(2);
  const isHighlighted = popular || featured;
  
  return (
    <Card 
      variant={isHighlighted ? "glow" : "glass"} 
      className={`relative overflow-hidden ${isHighlighted ? 'scale-105 z-10' : ''}`}
    >
      {featured && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-warning to-primary py-1 text-center">
          <span className="text-xs font-semibold text-primary-foreground flex items-center justify-center gap-1">
            <Crown className="w-3 h-3" /> FEATURED DEAL
          </span>
        </div>
      )}
      {popular && !featured && (
        <div className="absolute top-0 left-0 right-0 bg-primary py-1 text-center">
          <span className="text-xs font-semibold text-primary-foreground flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" /> MOST POPULAR
          </span>
        </div>
      )}
      <CardHeader className={isHighlighted ? "pt-10" : ""}>
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
          variant={isHighlighted ? "glow" : "glass"} 
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
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPacks = async () => {
      const { data } = await supabase
        .from('credit_packs')
        .select('*')
        .eq('is_active', true)
        .order('credits', { ascending: true });
      
      if (data) setPacks(data);
      setLoading(false);
    };
    loadPacks();
  }, []);

  if (loading) {
    return (
      <section className="py-20 px-4 relative">
        <div className="container max-w-5xl mx-auto flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

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
        <div className={`grid grid-cols-1 gap-6 items-center ${packs.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
          {packs.map((pack, index) => (
            <div 
              key={pack.id} 
              className="animate-slide-up"
              style={{ animationDelay: `${0.1 * (index + 1)}s` }}
            >
              <PricingCard 
                credits={pack.credits}
                price={Number(pack.price)}
                popular={pack.is_popular}
                featured={pack.is_featured}
                onSelect={() => onSelectPlan(pack.credits, Number(pack.price))} 
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
