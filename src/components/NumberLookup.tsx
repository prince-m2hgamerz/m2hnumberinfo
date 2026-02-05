import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Loader2,
  User,
  Phone,
  MapPin,
  Radio,
  Clock,
  Users,
  Mail,
  CreditCard,
  Timer,
  CalendarClock,
  Fingerprint,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/* ===============================
   TYPES
================================ */

interface RawNumberResult {
  name?: string;
  mobile?: string;
  father_name?: string | null;
  address?: string;
  alt_mobile?: string | null;
  circle?: string;
  email?: string | null;
}

interface NumberResult {
  name: string;
  mobile: string;
  fatherName?: string | null;
  address: string;
  altMobile?: string | null;
  circle: string;
  email?: string | null;
}

interface AadhaarResult {
  full_name?: string;
  name?: string;
  aadhar_number?: string;
  aadhaar_number?: string;
}

interface LookupMeta {
  processingTime?: number;
  timestamp?: string;
}

type LookupMode = "number" | "aadhaar";

interface Props {
  userId: string;
  credits: number;
  onLookup: (credits: number) => void;
  onHistoryUpdate: () => void;
}

/* ===============================
   HELPERS
================================ */

const normalizeNumberResult = (r: RawNumberResult): NumberResult => ({
  name: r.name ?? "Not available",
  mobile: r.mobile ?? "",
  fatherName: r.father_name ?? null,
  address: r.address ?? "Not available",
  altMobile: r.alt_mobile ?? null,
  circle: r.circle ?? "Not available",
  email: r.email ?? null,
});

const extractResults = (data: unknown): RawNumberResult[] => {
  if (typeof data !== "object" || data === null) return [];
  const d = data as {
    result?: unknown;
    allResults?: unknown;
    data?: unknown;
  };

  if (Array.isArray(d.result)) return d.result as RawNumberResult[];
  if (Array.isArray(d.allResults)) return d.allResults as RawNumberResult[];
  if (typeof d.data === "object" && d.data !== null) return [d.data as RawNumberResult];
  return [];
};

const hasValidNumberData = (r: NumberResult): boolean => {
  const invalid = ["not available", "n/a", ""];
  const bad = (v?: string | null) => !v || invalid.includes(v.toLowerCase());
  return !(bad(r.name) && bad(r.address) && bad(r.circle));
};

/* ===============================
   COMPONENT
================================ */

export const NumberLookup = ({ userId, credits, onLookup, onHistoryUpdate }: Props) => {
  const [number, setNumber] = useState("");
  const [mode, setMode] = useState<LookupMode>("number");
  const [loading, setLoading] = useState(false);

  const [results, setResults] = useState<NumberResult[]>([]);
  const [aadhaarResults, setAadhaarResults] = useState<AadhaarResult[]>([]);
  const [meta, setMeta] = useState<LookupMeta | null>(null);
  const [resultCount, setResultCount] = useState(0);

  const [rateLimitError, setRateLimitError] = useState<{
    message: string;
    remainingTime: number;
  } | null>(null);

  const { toast } = useToast();

  // Clear results when switching modes to prevent UI bugs
  const handleModeChange = (newMode: LookupMode) => {
    setMode(newMode);
    setResults([]);
    setAadhaarResults([]);
    setResultCount(0);
    setMeta(null);
  };

  useEffect(() => {
    if (!rateLimitError) return;
    const t = setInterval(() => {
      setRateLimitError((p) => (p && p.remainingTime > 1 ? { ...p, remainingTime: p.remainingTime - 1 } : null));
    }, 1000);
    return () => clearInterval(t);
  }, [rateLimitError]);

  /* ===============================
     LOOKUP LOGIC
  ================================ */

  const handleLookup = async () => {
    if (!/^\d{10}$/.test(number)) {
      toast({
        title: "Invalid Number",
        description: "Enter a valid 10-digit mobile number.",
        variant: "destructive",
      });
      return;
    }

    if (credits < 1) {
      toast({
        title: "Insufficient Credits",
        description: "Please purchase credits.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    // Reset state before new fetch
    setResults([]);
    setAadhaarResults([]);
    setResultCount(0);
    setMeta(null);

    try {
      /* ===== NUMBER LOOKUP ===== */
      if (mode === "number") {
        const { data, error } = await supabase.functions.invoke("number-lookup", {
          body: { userId, phoneNumber: number },
        });

        if (error) throw error;

        const raw = extractResults(data);
        const normalized = raw.map(normalizeNumberResult);
        const validResults = normalized.filter(hasValidNumberData);

        if (data && typeof data === "object" && "meta" in data) {
          setMeta((data as { meta?: LookupMeta }).meta ?? null);
        }

        if (!validResults.length) {
          toast({ title: "No Records Found", description: "No valid data found." });
        } else {
          setResults(validResults);
          setResultCount(validResults.length);
          onLookup((data as { remainingCredits?: number })?.remainingCredits ?? credits - 1);
          onHistoryUpdate();
          toast({ title: "Lookup Successful", description: `Found ${validResults.length} result(s).` });
        }
      }

      /* ===== AADHAAR LOOKUP ===== */
      if (mode === "aadhaar") {
        const { data, error } = await supabase.functions.invoke("aadhaar-lookup", {
          body: { userId, phoneNumber: number },
        });

        if (error) throw error;

        if (!data?.success) {
          toast({
            title: "No Aadhaar Data",
            description: data?.error || "No records found for this number.",
            variant: "destructive",
          });
          return;
        }

        const finalRecords = data.records || [];

        if (finalRecords.length === 0) {
          toast({ title: "No Records Found", description: "No Aadhaar data linked to this number." });
          return;
        }

        setAadhaarResults(finalRecords);
        setResultCount(finalRecords.length);

        onLookup(data.remainingCredits ?? credits - 1);
        onHistoryUpdate();

        toast({
          title: "Aadhaar Lookup Successful",
          description: "1 credit deducted.",
        });
      }
    } catch (err) {
      console.error("Lookup Error:", err);
      toast({
        title: "Lookup Failed",
        description: "Server communication error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="flex gap-2 items-center text-lg">
          <Search className="w-5 h-5 text-primary" />
          Information Search
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* MODE TOGGLE */}
        <div className="flex p-1 bg-muted rounded-lg w-fit">
          <Button
            size="sm"
            variant={mode === "number" ? "secondary" : "ghost"}
            className={mode === "number" ? "shadow-sm" : ""}
            onClick={() => handleModeChange("number")}
          >
            <Phone className="w-4 h-4 mr-2" /> Number
          </Button>
          <Button
            size="sm"
            variant={mode === "aadhaar" ? "secondary" : "ghost"}
            className={mode === "aadhaar" ? "shadow-sm" : ""}
            onClick={() => handleModeChange("aadhaar")}
          >
            <Fingerprint className="w-4 h-4 mr-2" /> Aadhaar
          </Button>
        </div>

        {/* INPUT BOX */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder={mode === "number" ? "Enter mobile number..." : "Enter linked mobile..."}
              className="font-mono pl-4 h-11"
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
          </div>
          <Button onClick={handleLookup} disabled={loading || number.length !== 10} className="h-11 px-6">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {/* RESULTS AREA */}
        {!loading && resultCount > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                Found {resultCount} record(s)
              </p>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4 w-max">
                {/* Render Number Search Results */}
                {mode === "number" &&
                  results.map((r, i) => (
                    <div key={i} className="w-[320px] p-5 rounded-xl border bg-card shadow-sm space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                          Subscriber
                        </p>
                        <p className="font-bold text-base flex gap-2 items-center">
                          <User className="w-4 h-4 text-primary" /> {r.name}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-mono">{r.mobile}</span>
                        </div>
                        {r.fatherName && (
                          <div className="text-muted-foreground">
                            <span className="font-medium text-foreground">Father:</span> {r.fatherName}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Radio className="w-3.5 h-3.5 text-muted-foreground" />
                          {r.circle}
                        </div>
                        {r.email && (
                          <div className="flex items-center gap-2 truncate">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                            {r.email}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          <MapPin className="inline w-3 h-3 mr-1 mb-0.5" />
                          {r.address}
                        </p>
                      </div>

                      {meta && (
                        <div className="pt-2 border-t flex justify-between text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Timer className="w-3 h-3" /> {meta.processingTime}ms
                          </span>
                          <span>{new Date().toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                  ))}

                {/* Render Aadhaar Search Results */}
                {mode === "aadhaar" &&
                  aadhaarResults.map((a, i) => (
                    <div key={i} className="w-[320px] p-5 rounded-xl border border-primary/20 bg-primary/5 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <CreditCard className="w-8 h-8 text-primary/60" />
                        <div className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded font-bold uppercase">
                          Identity Record
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Full Name</p>
                          <p className="font-bold text-lg">{a.name || a.full_name || "N/A"}</p>
                        </div>

                        <div className="bg-background/50 p-3 rounded-lg border border-dashed">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Aadhaar Number</p>
                          <p className="font-mono text-lg tracking-wider text-primary">
                            {a.aadhar_number || a.aadhaar_number || "Not Available"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
