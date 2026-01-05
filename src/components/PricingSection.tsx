import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
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
    <div className={`relative ${isHighlighted ? 'scale-[1.02]' : ''}`}>
      {(popular || featured) && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-foreground text-background text-xs font-medium">
            {featured ? 'Best Deal' : 'Popular'}
          </span>
        </div>
      )}
      <Card 
        variant={isHighlighted ? "glow" : "default"}
        className={`h-full ${isHighlighted ? 'border-muted-foreground/30' : ''}`}
      >
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-4xl font-bold font-mono">
            {credits}
            <span className="text-lg font-normal text-muted-foreground ml-1">credits</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <span className="text-3xl font-bold">₹{price}</span>
            <p className="text-sm text-muted-foreground mt-1">
              ₹{pricePerCredit} per lookup
            </p>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-success flex-shrink-0" />
              <span>Instant activation</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-success flex-shrink-0" />
              <span>Never expires</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-success flex-shrink-0" />
              <span>Full data access</span>
            </li>
          </ul>
          <Button 
            onClick={onSelect}
            variant={isHighlighted ? "default" : "outline"} 
            className="w-full"
            size="lg"
          >
            Buy Credits
          </Button>
        </CardContent>
      </Card>
    </div>
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
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 border-t border-border">
      <div className="container max-w-4xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Simple Pricing
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Buy credits once, use them anytime. No subscriptions.
          </p>
        </div>
        <div className={`grid gap-4 ${packs.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
          {packs.map((pack, index) => (
            <div 
              key={pack.id} 
              className="animate-fade-in"
              style={{ animationDelay: `${0.05 * (index + 1)}s` }}
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