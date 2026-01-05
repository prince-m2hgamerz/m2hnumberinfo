import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, User, Phone, MapPin, Radio, Clock, Users, Mail, UserCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NumberResult {
  name: string;
  mobile: string;
  fatherName?: string | null;
  address: string;
  altMobile?: string | null;
  circle: string;
  email?: string | null;
}

interface NumberLookupProps {
  userId: string;
  credits: number;
  onLookup: (newCredits: number) => void;
  onHistoryUpdate: () => void;
}

export const NumberLookup = ({ userId, credits, onLookup, onHistoryUpdate }: NumberLookupProps) => {
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<NumberResult[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [rateLimitError, setRateLimitError] = useState<{ message: string; remainingTime: number } | null>(null);
  const { toast } = useToast();

  // Countdown timer for rate limit
  useEffect(() => {
    if (rateLimitError && rateLimitError.remainingTime > 0) {
      const timer = setInterval(() => {
        setRateLimitError(prev => {
          if (!prev || prev.remainingTime <= 1) {
            return null;
          }
          return { ...prev, remainingTime: prev.remainingTime - 1 };
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [rateLimitError]);

  const handleLookup = async () => {
    if (!/^\d{10}$/.test(number)) {
      toast({
        title: "Invalid Number",
        description: "Please enter a valid 10-digit mobile number.",
        variant: "destructive",
      });
      return;
    }

    if (credits < 1) {
      toast({
        title: "Insufficient Credits",
        description: "Please purchase more credits to continue.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResults([]);
    setResultCount(0);
    setRateLimitError(null);

    try {
      const { data, error } = await supabase.functions.invoke('number-lookup', {
        body: { userId, phoneNumber: number }
      });

      if (error) throw error;

      if (data.error) {
        if (data.remainingTime) {
          setRateLimitError({
            message: data.message,
            remainingTime: data.remainingTime
          });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setResults(data.allResults || [data.data]);
      setResultCount(data.resultCount || 1);
      onLookup(data.remainingCredits);
      onHistoryUpdate();
      
      toast({
        title: "Lookup Successful",
        description: `Found ${data.resultCount || 1} result(s). 1 credit deducted.`,
      });
    } catch (error) {
      console.error('Lookup error:', error);
      toast({
        title: "Lookup Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="glass" className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Number Lookup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {rateLimitError && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30 animate-fade-in">
            <Clock className="w-5 h-5 text-warning" />
            <div className="flex-1">
              <p className="text-sm font-medium text-warning">Rate limit reached</p>
              <p className="text-xs text-muted-foreground">
                Please wait <span className="font-mono font-bold text-warning">{rateLimitError.remainingTime}s</span> before trying again
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Input
            type="tel"
            placeholder="Enter 10-digit mobile number"
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            className="font-mono text-lg"
            maxLength={10}
          />
          <Button 
            onClick={handleLookup} 
            disabled={loading || number.length !== 10 || !!rateLimitError}
            variant="glow"
            size="lg"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </Button>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-4 pt-4 border-t border-border animate-pulse">
            <div className="flex items-center gap-2">
              <div className="h-4 bg-secondary rounded w-24" />
              <div className="h-4 bg-secondary rounded w-16" />
            </div>
            {[1, 2].map((i) => (
              <div key={i} className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-secondary rounded w-1/3" />
                    <div className="h-3 bg-secondary rounded w-1/4" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-16 bg-secondary/50 rounded-lg" />
                  <div className="h-16 bg-secondary/50 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div className="animate-fade-in space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Found {resultCount} Result{resultCount > 1 ? 's' : ''}
              </h4>
            </div>
            
            <ScrollArea className={results.length > 1 ? "h-[400px] pr-4" : ""}>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div 
                    key={index} 
                    className="p-4 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{result.name}</p>
                        <p className="text-sm text-primary font-mono">{result.mobile}</p>
                      </div>
                      {index === 0 && results.length > 1 && (
                        <span className="ml-auto px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">Primary</span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.fatherName && (
                        <ResultItem icon={<UserCircle className="w-4 h-4" />} label="Father's Name" value={result.fatherName} />
                      )}
                      <ResultItem icon={<Radio className="w-4 h-4" />} label="Circle" value={result.circle} />
                      {result.altMobile && (
                        <ResultItem icon={<Phone className="w-4 h-4" />} label="Alt. Mobile" value={result.altMobile} />
                      )}
                      {result.email && (
                        <ResultItem icon={<Mail className="w-4 h-4" />} label="Email" value={result.email} />
                      )}
                      <div className="md:col-span-2">
                        <ResultItem icon={<MapPin className="w-4 h-4" />} label="Address" value={result.address} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ResultItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
    <div className="text-primary mt-0.5">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground break-words">{value}</p>
    </div>
  </div>
);
