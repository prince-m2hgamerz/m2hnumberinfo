import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, User, Phone, MapPin, Radio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NumberResult {
  name: string;
  mobile: string;
  address: string;
  circle: string;
}

interface NumberLookupProps {
  credits: number;
  onLookup: () => void;
}

export const NumberLookup = ({ credits, onLookup }: NumberLookupProps) => {
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NumberResult | null>(null);
  const { toast } = useToast();

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
    setResult(null);

    // Simulate API call - in production this would call the edge function
    setTimeout(() => {
      setResult({
        name: "Demo User",
        mobile: number,
        address: "Demo Address, City, State",
        circle: "Demo Circle",
      });
      onLookup();
      setLoading(false);
      toast({
        title: "Lookup Successful",
        description: "1 credit has been deducted from your account.",
      });
    }, 1500);
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
            disabled={loading || number.length !== 10}
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

        {result && (
          <div className="animate-fade-in space-y-4 pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground">Search Results</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResultItem icon={<User className="w-4 h-4" />} label="Name" value={result.name} />
              <ResultItem icon={<Phone className="w-4 h-4" />} label="Mobile" value={result.mobile} />
              <ResultItem icon={<MapPin className="w-4 h-4" />} label="Address" value={result.address} />
              <ResultItem icon={<Radio className="w-4 h-4" />} label="Circle" value={result.circle} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ResultItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
    <div className="text-primary mt-0.5">{icon}</div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  </div>
);
